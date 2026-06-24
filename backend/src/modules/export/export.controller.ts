import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { products, productVariants, variantUnits, categories, customers, suppliers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

function formatCSVCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

export class ExportController {
  static async exportProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      // 1. Fetch all products with categories
      const allProducts = await db.select({
        id: products.id,
        name: products.name,
        description: products.description,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.businessId, businessId))
      .orderBy(products.name);

      const productIds = allProducts.map(p => p.id);
      let variants: any[] = [];
      let units: any[] = [];

      if (productIds.length > 0) {
        variants = await db.select().from(productVariants).where(eq(productVariants.businessId, businessId));
        const variantIds = variants.map(v => v.id);
        if (variantIds.length > 0) {
          units = await db.select().from(variantUnits).where(eq(variantUnits.businessId, businessId));
        }
      }

      // 2. Format CSV lines
      const headers = ['Name', 'Description', 'Category', 'SKU', 'Cost Price', 'Base Unit Name', 'Selling Price', 'Low Stock Threshold', 'Initial Stock'];
      const rows: string[][] = [];

      allProducts.forEach(p => {
        const pVariants = variants.filter(v => v.productId === p.id);
        pVariants.forEach(v => {
          const defaultUnit = units.find(u => u.variantId === v.id && u.isDefault) || units.find(u => u.variantId === v.id);
          const sellingPrice = defaultUnit ? defaultUnit.sellingPrice : '0';

          rows.push([
            p.name,
            p.description || '',
            p.categoryName || '',
            v.sku || '',
            v.costPrice,
            v.baseUnitName,
            sellingPrice,
            v.lowStockThreshold,
            v.baseStockQuantity
          ]);
        });
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(formatCSVCell).join(','))
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="products_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  static async exportCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      const allCustomers = await db.select()
        .from(customers)
        .where(eq(customers.businessId, businessId))
        .orderBy(customers.name);

      const headers = ['Name', 'Phone', 'National ID', 'Address', 'Notes', 'Type'];
      const rows = allCustomers.map(c => [
        c.name,
        c.phone || '',
        c.nationalId || '',
        c.address || '',
        c.notes || '',
        c.type
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(formatCSVCell).join(','))
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  static async exportSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;

      const allSuppliers = await db.select()
        .from(suppliers)
        .where(eq(suppliers.businessId, businessId))
        .orderBy(suppliers.name);

      const headers = ['Name', 'Phone', 'Email'];
      const rows = allSuppliers.map(s => [
        s.name,
        s.phone || '',
        s.email || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(formatCSVCell).join(','))
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="suppliers_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
