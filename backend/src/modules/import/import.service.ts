import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { categories, products, productVariants, variantUnits, customers, suppliers } from '../../db/schema';
import { InventoryService } from '../inventory/inventory.service';

export interface ImportResult {
  successCount: number;
  failureCount: number;
  errors: { row: number; name: string; message: string }[];
}

export class ImportService {
  /**
   * Simple state-machine CSV parser that handles commas, quoted text, and escaped quotes.
   */
  static parseCSV(text: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

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
        result.push(row);
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }

    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      result.push(row);
    }

    return result.filter(r => r.length > 0 && r.some(cell => cell !== ''));
  }

  static async importProducts(businessId: string, userId: string, csvText: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) {
      throw new Error('CSV file is empty or contains only headers');
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const nameIdx = headers.indexOf('name');
    const descIdx = headers.indexOf('description');
    const catIdx = headers.indexOf('category');
    const skuIdx = headers.indexOf('sku');
    const costPriceIdx = headers.indexOf('cost price');
    const baseUnitIdx = headers.indexOf('base unit name');
    const sellingPriceIdx = headers.indexOf('selling price');
    const thresholdIdx = headers.indexOf('low stock threshold');
    const stockIdx = headers.indexOf('initial stock');

    if (nameIdx === -1 || catIdx === -1 || sellingPriceIdx === -1) {
      throw new Error('CSV must contain at least "Name", "Category", and "Selling Price" columns');
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        const name = row[nameIdx];
        const categoryName = row[catIdx];
        const sellingPriceStr = row[sellingPriceIdx];

        if (!name || !categoryName || !sellingPriceStr) {
          throw new Error('Missing required fields (Name, Category, or Selling Price)');
        }

        const sellingPrice = Number(sellingPriceStr);
        if (isNaN(sellingPrice) || sellingPrice < 0) {
          throw new Error('Selling Price must be a positive number');
        }

        const description = descIdx !== -1 ? row[descIdx] : '';
        const sku = skuIdx !== -1 ? row[skuIdx] : undefined;
        const costPrice = costPriceIdx !== -1 ? Number(row[costPriceIdx] || 0) : 0;
        const baseUnitName = baseUnitIdx !== -1 ? (row[baseUnitIdx] || 'Piece') : 'Piece';
        const lowStockThreshold = thresholdIdx !== -1 ? Number(row[thresholdIdx] || 0) : 0;
        const initialStock = stockIdx !== -1 ? Number(row[stockIdx] || 0) : 0;

        if (isNaN(costPrice) || costPrice < 0) throw new Error('Cost Price must be non-negative');
        if (isNaN(lowStockThreshold) || lowStockThreshold < 0) throw new Error('Low Stock Threshold must be non-negative');
        if (isNaN(initialStock) || initialStock < 0) throw new Error('Initial Stock must be non-negative');

        // Check if SKU exists already in this business
        if (sku) {
          const [existingSku] = await db.select()
            .from(productVariants)
            .where(and(eq(productVariants.sku, sku), eq(productVariants.businessId, businessId)))
            .limit(1);
          if (existingSku) {
            throw new Error(`SKU "${sku}" already exists`);
          }
        }

        // Run as single transaction
        await db.transaction(async (tx) => {
          // 1. Get or create category
          let [category] = await tx.select()
            .from(categories)
            .where(and(eq(categories.name, categoryName), eq(categories.businessId, businessId)))
            .limit(1);
          
          let categoryId;
          if (!category) {
            const [newCat] = await tx.insert(categories).values({
              name: categoryName,
              businessId,
            }).returning();
            categoryId = newCat.id;
          } else {
            categoryId = category.id;
          }

          // 2. Insert product
          const [product] = await tx.insert(products).values({
            name,
            description,
            categoryId,
            businessId,
            createdBy: userId,
          }).returning();

          // 3. Insert variant
          const [variant] = await tx.insert(productVariants).values({
            businessId,
            productId: product.id,
            name: 'Standard',
            sku,
            costPrice: costPrice.toString(),
            baseUnitName,
            baseStockQuantity: '0.000',
            lowStockThreshold: lowStockThreshold.toString(),
          }).returning();

          // 4. Insert unit
          await tx.insert(variantUnits).values({
            businessId,
            variantId: variant.id,
            name: baseUnitName,
            sellingPrice: sellingPrice.toString(),
            conversionFactor: '1.0000',
            isDefault: true,
          });

          // 5. Stock movement
          if (initialStock > 0) {
            await InventoryService.recordMovement(tx, businessId, {
              variantId: variant.id,
              type: 'ADJUSTMENT',
              quantityChange: initialStock,
              notes: 'CSV Bulk Import',
              userId,
            });
          }
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

  static async importCustomers(businessId: string, userId: string, csvText: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) {
      throw new Error('CSV file is empty or contains only headers');
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const nameIdx = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone');
    const idIdx = headers.indexOf('national id');
    const addressIdx = headers.indexOf('address');
    const notesIdx = headers.indexOf('notes');
    const typeIdx = headers.indexOf('type');

    if (nameIdx === -1) {
      throw new Error('CSV must contain at least a "Name" column');
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        const name = row[nameIdx];
        if (!name) throw new Error('Name is required');

        const phone = phoneIdx !== -1 ? row[phoneIdx] : undefined;
        const nationalId = idIdx !== -1 ? row[idIdx] : undefined;
        const address = addressIdx !== -1 ? row[addressIdx] : undefined;
        const notes = notesIdx !== -1 ? row[notesIdx] : undefined;
        let type = typeIdx !== -1 ? row[typeIdx]?.toUpperCase() : 'INDIVIDUAL';
        if (type !== 'BUSINESS') type = 'INDIVIDUAL';

        if (phone) {
          const [existingCustomer] = await db.select()
            .from(customers)
            .where(and(eq(customers.phone, phone), eq(customers.businessId, businessId)))
            .limit(1);
          if (existingCustomer) {
            throw new Error(`Customer with phone "${phone}" already exists`);
          }
        }

        await db.insert(customers).values({
          businessId,
          name,
          phone,
          nationalId,
          address,
          notes,
          type: type as 'INDIVIDUAL' | 'BUSINESS',
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

  static async importSuppliers(businessId: string, userId: string, csvText: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) {
      throw new Error('CSV file is empty or contains only headers');
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const nameIdx = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone');
    const emailIdx = headers.indexOf('email');

    if (nameIdx === -1) {
      throw new Error('CSV must contain at least a "Name" column');
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        const name = row[nameIdx];
        if (!name) throw new Error('Name is required');

        const phone = phoneIdx !== -1 ? row[phoneIdx] : undefined;
        const email = emailIdx !== -1 ? row[emailIdx] : undefined;

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
          phone,
          email,
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
