import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { categories, products, productVariants, variantUnits, stockMovements, customers, suppliers } from '../../db/schema';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { AppError } from '../../core/utils/AppError';
import { flushPattern } from '../../core/cache/redis';

export interface ImportResult {
  successCount: number;
  failureCount: number;
  errors: { row: number; name: string; message: string }[];
}

export class ImportService {
  /**
   * State-machine CSV parser that handles commas, quoted text, escaped quotes, and BOM headers.
   */
  static parseCSV(text: string): string[][] {
    const cleanText = (text || '').replace(/^\uFEFF/, '');
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        row.push(currentVal.trim());
        if (row.some(cell => cell.length > 0)) {
          result.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }

    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      if (row.some(cell => cell.length > 0)) {
        result.push(row);
      }
    }

    return result;
  }

  static async importProducts(businessId: string, userId: string, csvText: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) {
      throw new AppError('CSV file is empty or contains only headers', 400);
    }

    const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').toLowerCase().trim());
    
    // Strict header matching helper
    const findHeaderIdx = (exactPatterns: string[], fallbackSubstring?: string) => {
      let idx = headers.findIndex(h => exactPatterns.some(p => h === p));
      if (idx !== -1) return idx;
      if (fallbackSubstring) {
        idx = headers.findIndex(h => h.includes(fallbackSubstring));
      }
      return idx;
    };

    const nameIdx = findHeaderIdx(['name', 'product name', 'product_name'], 'name');
    const descIdx = findHeaderIdx(['description', 'desc'], 'desc');
    const catIdx = findHeaderIdx(['category', 'category name', 'category_name'], 'cat');
    const skuIdx = findHeaderIdx(['sku', 'item code', 'barcode', 'code'], 'sku');
    const costPriceIdx = findHeaderIdx(['cost price', 'cost_price', 'purchase price', 'purchase_price', 'cost']);
    const baseUnitIdx = findHeaderIdx(['base unit name', 'unit name', 'base unit', 'unit']);
    const sellingPriceIdx = findHeaderIdx(['selling price', 'selling_price', 'selling', 'price']);
    const minimumPriceIdx = findHeaderIdx(['minimum price', 'minimum_price', 'min price', 'min_price']);
    const thresholdIdx = findHeaderIdx(['low stock threshold', 'threshold', 'reorder level']);
    const stockIdx = findHeaderIdx(['initial stock', 'initial stock quantity', 'stock', 'qty', 'quantity']);

    if (nameIdx === -1 || catIdx === -1 || sellingPriceIdx === -1) {
      throw new AppError('CSV must contain at least "Name", "Category", and "Selling Price" columns', 400);
    }

    interface ValidatedRow {
      rowNum: number;
      name: string;
      categoryName: string;
      sellingPrice: number;
      costPrice: number;
      minimumPrice: number | null;
      description: string | null;
      sku: string | null;
      baseUnitName: string;
      lowStockThreshold: number;
      initialStock: number;
    }

    const validatedRows: ValidatedRow[] = [];
    const errors: { row: number; name: string; message: string }[] = [];
    const seenNamesInCSV = new Set<string>();
    const seenSkusInCSV = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row || row.every(cell => !cell.trim())) continue;

      try {
        const name = row[nameIdx]?.trim();
        const categoryName = row[catIdx]?.trim();
        const sellingPriceStr = row[sellingPriceIdx]?.trim();

        if (!name || !categoryName || !sellingPriceStr) {
          throw new Error('Missing required fields (Name, Category, or Selling Price)');
        }

        const sellingPrice = Number(sellingPriceStr);
        if (isNaN(sellingPrice) || sellingPrice < 0) {
          throw new Error('Selling Price must be a non-negative number');
        }

        if (seenNamesInCSV.has(name.toLowerCase())) {
          throw new Error(`Duplicate product name "${name}" in CSV`);
        }
        seenNamesInCSV.add(name.toLowerCase());

        const sku = skuIdx !== -1 ? row[skuIdx]?.trim() || null : null;
        if (sku) {
          if (seenSkusInCSV.has(sku.toLowerCase())) {
            throw new Error(`Duplicate SKU "${sku}" in CSV`);
          }
          seenSkusInCSV.add(sku.toLowerCase());
        }

        const description = descIdx !== -1 ? row[descIdx]?.trim() || null : null;
        const costPrice = costPriceIdx !== -1 && row[costPriceIdx]?.trim() ? Number(row[costPriceIdx]?.trim()) : 0;
        const baseUnitName = baseUnitIdx !== -1 ? (row[baseUnitIdx]?.trim() || 'Piece') : 'Piece';
        const rawMinPrice = minimumPriceIdx !== -1 && row[minimumPriceIdx]?.trim() ? Number(row[minimumPriceIdx]?.trim()) : null;
        const minimumPrice = (rawMinPrice !== null && !isNaN(rawMinPrice) && rawMinPrice > 0) ? rawMinPrice : sellingPrice;
        const lowStockThreshold = thresholdIdx !== -1 && row[thresholdIdx]?.trim() ? Number(row[thresholdIdx]?.trim()) : 0;
        const initialStock = stockIdx !== -1 && row[stockIdx]?.trim() ? Number(row[stockIdx]?.trim()) : 0;

        if (isNaN(costPrice) || costPrice < 0) throw new Error('Cost Price must be non-negative');
        if (isNaN(lowStockThreshold) || lowStockThreshold < 0) throw new Error('Low Stock Threshold must be non-negative');
        if (isNaN(initialStock) || initialStock < 0) throw new Error('Initial Stock must be non-negative');

        validatedRows.push({
          rowNum,
          name,
          categoryName,
          sellingPrice,
          costPrice,
          minimumPrice,
          description,
          sku,
          baseUnitName,
          lowStockThreshold,
          initialStock,
        });
      } catch (err: any) {
        errors.push({
          row: rowNum,
          name: row[nameIdx] || `Row ${rowNum}`,
          message: err.message || 'Validation failed',
        });
      }
    }

    if (errors.length > 0) {
      return {
        successCount: 0,
        failureCount: errors.length,
        errors,
      };
    }

    if (validatedRows.length === 0) {
      throw new AppError('No valid rows found in CSV', 400);
    }

    // Single fast database transaction for bulk inserts
    await db.transaction(async (tx) => {
      // 1. Pre-check existing SKUs in DB
      const skusToCheck = validatedRows.map(r => r.sku).filter(Boolean) as string[];
      if (skusToCheck.length > 0) {
        const existingVariants = await tx.select({ sku: productVariants.sku })
          .from(productVariants)
          .where(and(eq(productVariants.businessId, businessId), inArray(productVariants.sku, skusToCheck)));
        if (existingVariants.length > 0) {
          throw new AppError(`SKU "${existingVariants[0].sku}" already exists in your catalog`, 400);
        }
      }

      // 2. Pre-check existing Product Names in DB
      const namesToCheck = validatedRows.map(r => r.name);
      const existingProducts = await tx.select({ name: products.name })
        .from(products)
        .where(and(eq(products.businessId, businessId), inArray(products.name, namesToCheck)));
      if (existingProducts.length > 0) {
        throw new AppError(`Product "${existingProducts[0].name}" already exists in your catalog`, 400);
      }

      // 3. Resolve Categories
      const uniqueCategoryNames = Array.from(new Set(validatedRows.map(r => r.categoryName)));
      const existingCats = await tx.select()
        .from(categories)
        .where(and(eq(categories.businessId, businessId), inArray(categories.name, uniqueCategoryNames)));

      const categoryMap = new Map<string, string>();
      existingCats.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));

      const missingCategoryNames = uniqueCategoryNames.filter(cName => !categoryMap.has(cName.toLowerCase()));
      if (missingCategoryNames.length > 0) {
        const insertedCats = await tx.insert(categories).values(
          missingCategoryNames.map(cName => ({
            businessId,
            name: cName,
          }))
        ).returning();
        insertedCats.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));
      }

      // 4. Bulk Insert Products
      const productsToInsert = validatedRows.map(r => ({
        businessId,
        categoryId: categoryMap.get(r.categoryName.toLowerCase())!,
        name: r.name,
        description: r.description,
        createdBy: userId,
      }));

      const insertedProducts = await tx.insert(products).values(productsToInsert).returning();

      // 5. Bulk Insert Variants
      const variantsToInsert = insertedProducts.map((p, idx) => {
        const r = validatedRows[idx];
        return {
          productId: p.id,
          businessId,
          name: 'Standard',
          sku: r.sku,
          costPrice: r.costPrice.toString(),
          baseUnitName: r.baseUnitName,
          baseStockQuantity: r.initialStock.toString(),
          lowStockThreshold: r.lowStockThreshold.toString(),
        };
      });

      const insertedVariants = await tx.insert(productVariants).values(variantsToInsert).returning();

      // 6. Bulk Insert Units & Stock Movements
      const variantUnitsToInsert = [];
      const stockMovementsToInsert = [];

      for (let idx = 0; idx < validatedRows.length; idx++) {
        const r = validatedRows[idx];
        const variant = insertedVariants[idx];

        variantUnitsToInsert.push({
          businessId,
          variantId: variant.id,
          name: r.baseUnitName,
          sellingPrice: r.sellingPrice.toString(),
          minimumPrice: r.minimumPrice !== null ? r.minimumPrice.toString() : null,
          conversionFactor: '1',
          isDefault: true,
        });

        if (r.initialStock > 0) {
          stockMovementsToInsert.push({
            businessId,
            variantId: variant.id,
            type: 'ADJUSTMENT' as const,
            quantityChange: r.initialStock.toString(),
            notes: 'CSV Bulk Import Initial Stock',
            createdBy: userId,
          });
        }
      }

      if (variantUnitsToInsert.length > 0) {
        await tx.insert(variantUnits).values(variantUnitsToInsert);
      }

      if (stockMovementsToInsert.length > 0) {
        await tx.insert(stockMovements).values(stockMovementsToInsert);
      }
    });

    try {
      await flushPattern(`cache:${businessId}:/catalog*`);
    } catch (err) {
      console.error('Failed to flush catalog cache on import:', err);
    }

    return {
      successCount: validatedRows.length,
      failureCount: 0,
      errors: [],
    };
  }

  static async importCustomers(businessId: string, userId: string, csvText: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) {
      throw new AppError('CSV file is empty or contains only headers', 400);
    }

    const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').toLowerCase().trim());
    const findHeaderIdx = (patterns: string[]) => {
      return headers.findIndex(h => patterns.some(p => h === p || h.includes(p)));
    };

    const nameIdx = findHeaderIdx(['name', 'customer', 'client']);
    const phoneIdx = findHeaderIdx(['phone', 'mobile', 'contact', 'tel']);
    const idIdx = findHeaderIdx(['national id', 'id number', 'id', 'nationalid']);
    const addressIdx = findHeaderIdx(['address', 'location']);
    const notesIdx = findHeaderIdx(['notes', 'note', 'comment']);
    const typeIdx = findHeaderIdx(['type']);
    const amountOwedIdx = findHeaderIdx(['amount owed', 'balance', 'debt', 'amount_owed', 'owed']);
    const periodOwedIdx = findHeaderIdx(['period owed', 'period', 'period_owed']);
    const baseSalaryIdx = findHeaderIdx(['base salary', 'salary', 'base_salary', 'base']);

    if (nameIdx === -1) {
      throw new AppError('CSV must contain at least a "Name" or "Customer" column', 400);
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row || row.every(cell => !cell.trim())) continue;

      try {
        const name = row[nameIdx]?.trim();
        if (!name) throw new Error('Customer name is required');

        const rawPhone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : undefined;
        const phone = rawPhone ? rawPhone : undefined;

        const rawId = idIdx !== -1 ? row[idIdx]?.trim() : undefined;
        const nationalId = rawId ? rawId : undefined;

        const rawAddress = addressIdx !== -1 ? row[addressIdx]?.trim() : undefined;
        const address = rawAddress ? rawAddress : undefined;

        const rawNotes = notesIdx !== -1 ? row[notesIdx]?.trim() : undefined;
        const notes = rawNotes ? rawNotes : undefined;

        let type = typeIdx !== -1 ? row[typeIdx]?.trim()?.toUpperCase() : 'INDIVIDUAL';
        if (type !== 'BUSINESS' && type !== 'EMPLOYEE') type = 'INDIVIDUAL';

        const amountOwedRaw = amountOwedIdx !== -1 ? row[amountOwedIdx]?.trim() : undefined;
        const amountOwed = amountOwedRaw ? Number(amountOwedRaw) : 0;
        const rawPeriod = periodOwedIdx !== -1 ? row[periodOwedIdx]?.trim() : undefined;

        const baseSalaryRaw = baseSalaryIdx !== -1 ? row[baseSalaryIdx]?.trim() : undefined;
        const baseSalary = baseSalaryRaw ? Number(baseSalaryRaw) : 0;
        const validSalary = !isNaN(baseSalary) && baseSalary > 0 ? baseSalary : 0;

        if (phone) {
          const [existingCustomer] = await db.select()
            .from(customers)
            .where(and(eq(customers.phone, phone), eq(customers.businessId, businessId)))
            .limit(1);
          if (existingCustomer) {
            throw new Error(`Customer with phone "${phone}" already exists`);
          }
        }

        const validAmount = !isNaN(amountOwed) && amountOwed > 0 ? amountOwed : 0;

        await db.insert(customers).values({
          businessId,
          name,
          phone: phone || null,
          nationalId: nationalId || null,
          address: address || null,
          notes: notes || null,
          type: type as 'INDIVIDUAL' | 'BUSINESS' | 'EMPLOYEE',
          balance: validAmount > 0 ? validAmount.toString() : '0',
          baseSalary: validSalary > 0 ? validSalary.toString() : '0',
          periodOwed: validAmount > 0 ? (rawPeriod || null) : null,
          hasActiveCredit: validAmount > 0,
          createdBy: userId,
        });

        successCount++;
      } catch (err: any) {
        failureCount++;
        errors.push({
          row: rowNum,
          name: row[nameIdx] || `Row ${rowNum}`,
          message: err.message || 'Validation failed',
        });
      }
    }

    if (successCount > 0) {
      await CustomersService.invalidateCustomerCache(businessId);
    }

    return { successCount, failureCount, errors };
  }

  static async importSuppliers(businessId: string, userId: string, csvText: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) {
      throw new AppError('CSV file is empty or contains only headers', 400);
    }

    const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').toLowerCase().trim());
    const findHeaderIdx = (patterns: string[]) => {
      return headers.findIndex(h => patterns.some(p => h === p || h.includes(p)));
    };

    const nameIdx = findHeaderIdx(['name', 'supplier']);
    const phoneIdx = findHeaderIdx(['phone', 'mobile', 'contact', 'tel']);
    const emailIdx = findHeaderIdx(['email']);

    if (nameIdx === -1) {
      throw new AppError('CSV must contain at least a "Name" or "Supplier" column', 400);
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row || row.every(cell => !cell.trim())) continue;

      try {
        const name = row[nameIdx]?.trim();
        if (!name) throw new Error('Supplier name is required');

        const rawPhone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : undefined;
        const phone = rawPhone ? rawPhone : undefined;

        const rawEmail = emailIdx !== -1 ? row[emailIdx]?.trim() : undefined;
        const email = rawEmail ? rawEmail : undefined;

        if (email) {
          const [existingSupplier] = await db.select()
            .from(suppliers)
            .where(and(eq(suppliers.email, email), eq(suppliers.businessId, businessId)))
            .limit(1);
          if (existingSupplier) {
            throw new Error(`Supplier with email "${email}" already exists`);
          }
        }

        await db.insert(suppliers).values({
          businessId,
          name,
          phone: phone || null,
          email: email || null,
          createdBy: userId,
        });

        successCount++;
      } catch (err: any) {
        failureCount++;
        errors.push({
          row: rowNum,
          name: row[nameIdx] || `Row ${rowNum}`,
          message: err.message || 'Validation failed',
        });
      }
    }

    return { successCount, failureCount, errors };
  }
}
