import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { categories, products, productVariants, variantUnits, customers, suppliers } from '../../db/schema';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { AppError } from '../../core/utils/AppError';

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
    const findHeaderIdx = (patterns: string[]) => {
      return headers.findIndex(h => patterns.some(p => h === p || h.includes(p)));
    };

    const nameIdx = findHeaderIdx(['name', 'product']);
    const descIdx = findHeaderIdx(['description', 'desc']);
    const catIdx = findHeaderIdx(['category', 'cat']);
    const skuIdx = findHeaderIdx(['sku', 'code', 'barcode']);
    const costPriceIdx = findHeaderIdx(['cost price', 'cost_price', 'cost']);
    const baseUnitIdx = findHeaderIdx(['base unit name', 'unit name', 'unit']);
    const sellingPriceIdx = findHeaderIdx(['selling price', 'selling_price', 'price']);
    const minimumPriceIdx = findHeaderIdx(['minimum price', 'minimum_price', 'min price', 'min_price']);
    const thresholdIdx = findHeaderIdx(['low stock threshold', 'threshold', 'reorder level']);
    const stockIdx = findHeaderIdx(['initial stock', 'stock', 'qty', 'quantity']);

    if (nameIdx === -1 || catIdx === -1 || sellingPriceIdx === -1) {
      throw new AppError('CSV must contain at least "Name", "Category", and "Selling Price" columns', 400);
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
        const categoryName = row[catIdx]?.trim();
        const sellingPriceStr = row[sellingPriceIdx]?.trim();

        if (!name || !categoryName || !sellingPriceStr) {
          throw new Error('Missing required fields (Name, Category, or Selling Price)');
        }

        const sellingPrice = Number(sellingPriceStr);
        if (isNaN(sellingPrice) || sellingPrice < 0) {
          throw new Error('Selling Price must be a positive number');
        }

        const description = descIdx !== -1 ? row[descIdx]?.trim() || '' : '';
        const sku = skuIdx !== -1 ? row[skuIdx]?.trim() || undefined : undefined;
        const costPrice = costPriceIdx !== -1 ? Number(row[costPriceIdx]?.trim() || 0) : 0;
        const baseUnitName = baseUnitIdx !== -1 ? (row[baseUnitIdx]?.trim() || 'Piece') : 'Piece';
        const minimumPrice = minimumPriceIdx !== -1 ? Number(row[minimumPriceIdx]?.trim() || sellingPrice) : sellingPrice;
        const lowStockThreshold = thresholdIdx !== -1 ? Number(row[thresholdIdx]?.trim() || 0) : 0;
        const initialStock = stockIdx !== -1 ? Number(row[stockIdx]?.trim() || 0) : 0;

        if (isNaN(costPrice) || costPrice < 0) throw new Error('Cost Price must be non-negative');
        if (isNaN(lowStockThreshold) || lowStockThreshold < 0) throw new Error('Low Stock Threshold must be non-negative');
        if (isNaN(initialStock) || initialStock < 0) throw new Error('Initial Stock must be non-negative');

        if (sku) {
          const [existingSku] = await db.select()
            .from(productVariants)
            .where(and(eq(productVariants.sku, sku), eq(productVariants.businessId, businessId)))
            .limit(1);
          if (existingSku) {
            throw new Error(`SKU "${sku}" already exists`);
          }
        }

        let [category] = await db.select()
          .from(categories)
          .where(and(eq(sql`LOWER(${categories.name})`, categoryName.toLowerCase()), eq(categories.businessId, businessId)))
          .limit(1);

        if (!category) {
          [category] = await db.insert(categories).values({
            businessId,
            name: categoryName,
          }).returning();
        }

        const [product] = await db.insert(products).values({
          businessId,
          categoryId: category.id,
          name,
          description: description || null,
        }).returning();

        const [variant] = await db.insert(productVariants).values({
          productId: product.id,
          businessId,
          name: 'Standard',
          sku: sku || null,
          costPrice: costPrice.toString(),
          baseUnitName: baseUnitName || 'Piece',
          baseStockQuantity: '0',
          lowStockThreshold: lowStockThreshold.toString(),
        }).returning();

        await db.insert(variantUnits).values({
          businessId,
          variantId: variant.id,
          name: baseUnitName || 'Piece',
          sellingPrice: sellingPrice.toString(),
          minimumPrice: (!isNaN(minimumPrice) && minimumPrice > 0) ? minimumPrice.toString() : null,
          conversionFactor: '1',
          isDefault: true,
        });

        if (initialStock > 0) {
          await InventoryService.manualAdjustment(
            businessId,
            userId,
            {
              variantId: variant.id,
              newQuantity: initialStock,
              notes: 'CSV Bulk Import Initial Stock',
            }
          );
        }

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
