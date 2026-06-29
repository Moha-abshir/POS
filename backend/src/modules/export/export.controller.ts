import { Request, Response, NextFunction } from 'express';
import { pool } from '../../db';
import QueryStream from 'pg-query-stream';
import { Transform } from 'stream';

function formatCSVCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

class CSVTransformStream extends Transform {
  private isHeaderWritten = false;
  constructor(private headers: string[], private columns: string[]) {
    super({ objectMode: true });
  }

  _transform(row: any, encoding: string, callback: Function) {
    let chunk = '';
    if (!this.isHeaderWritten) {
      chunk += this.headers.join(',') + '\r\n';
      this.isHeaderWritten = true;
    }
    const csvRow = this.columns.map(col => formatCSVCell(row[col])).join(',');
    chunk += csvRow + '\r\n';
    callback(null, chunk);
  }
}

export class ExportController {
  static async exportProducts(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    let client: any;
    try {
      client = await pool.connect();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="products_export_${new Date().toISOString().split('T')[0]}.csv"`);

      const queryText = `
        SELECT 
          p.name AS "productName",
          p.description AS "productDescription",
          c.name AS "categoryName",
          v.sku AS "sku",
          v.cost_price AS "costPrice",
          v.base_unit_name AS "baseUnitName",
          v.low_stock_threshold AS "lowStockThreshold",
          v.base_stock_quantity AS "baseStockQuantity",
          u.selling_price AS "sellingPrice"
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        INNER JOIN product_variants v ON v.product_id = p.id
        LEFT JOIN variant_units u ON u.id = (
          SELECT id FROM variant_units 
          WHERE variant_id = v.id 
          ORDER BY is_default DESC, created_at ASC 
          LIMIT 1
        )
        WHERE p.business_id = $1
        ORDER BY p.name;
      `;

      const headers = ['Name', 'Description', 'Category', 'SKU', 'Cost Price', 'Base Unit Name', 'Selling Price', 'Low Stock Threshold', 'Initial Stock'];
      const columns = ['productName', 'productDescription', 'categoryName', 'sku', 'costPrice', 'baseUnitName', 'sellingPrice', 'lowStockThreshold', 'baseStockQuantity'];

      const query = new QueryStream(queryText, [businessId]);
      const dbStream = client.query(query);

      const csvTransform = new CSVTransformStream(headers, columns);

      dbStream.pipe(csvTransform).pipe(res);

      dbStream.on('end', () => {
        client.release();
      });

      dbStream.on('error', (err: any) => {
        client.release();
        if (!res.headersSent) {
          next(err);
        }
      });
    } catch (error) {
      if (client) {
        client.release();
      }
      next(error);
    }
  }

  static async exportCustomers(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    let client: any;
    try {
      client = await pool.connect();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.csv"`);

      const queryText = `
        SELECT name, phone, national_id AS "nationalId", address, notes, type 
        FROM customers 
        WHERE business_id = $1 
        ORDER BY name;
      `;

      const headers = ['Name', 'Phone', 'National ID', 'Address', 'Notes', 'Type'];
      const columns = ['name', 'phone', 'nationalId', 'address', 'notes', 'type'];

      const query = new QueryStream(queryText, [businessId]);
      const dbStream = client.query(query);

      const csvTransform = new CSVTransformStream(headers, columns);

      dbStream.pipe(csvTransform).pipe(res);

      dbStream.on('end', () => {
        client.release();
      });

      dbStream.on('error', (err: any) => {
        client.release();
        if (!res.headersSent) {
          next(err);
        }
      });
    } catch (error) {
      if (client) {
        client.release();
      }
      next(error);
    }
  }

  static async exportSuppliers(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    let client: any;
    try {
      client = await pool.connect();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="suppliers_export_${new Date().toISOString().split('T')[0]}.csv"`);

      const queryText = `
        SELECT name, phone, email 
        FROM suppliers 
        WHERE business_id = $1 
        ORDER BY name;
      `;

      const headers = ['Name', 'Phone', 'Email'];
      const columns = ['name', 'phone', 'email'];

      const query = new QueryStream(queryText, [businessId]);
      const dbStream = client.query(query);

      const csvTransform = new CSVTransformStream(headers, columns);

      dbStream.pipe(csvTransform).pipe(res);

      dbStream.on('end', () => {
        client.release();
      });

      dbStream.on('error', (err: any) => {
        client.release();
        if (!res.headersSent) {
          next(err);
        }
      });
    } catch (error) {
      if (client) {
        client.release();
      }
      next(error);
    }
  }
}
