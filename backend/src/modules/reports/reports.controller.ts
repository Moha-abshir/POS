import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';

export class ReportsController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportsService.getOverviewReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const data = await ReportsService.getSalesReport(req.user!.businessId, {
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as any
      });
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getProductSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, search, paymentMethod } = req.query;
      const data = await ReportsService.getProductSalesReport(req.user!.businessId, {
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
        paymentMethod: paymentMethod as string
      });
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getProfitLoss(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportsService.getProfitLossReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportsService.getInventoryReport(req.user!.businessId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportsService.getCustomerReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportsService.getCreditReport(req.user!.businessId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportsService.getSupplierReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getMpesa(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportsService.getMpesaReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getRefunds(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportsService.getRefundReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getDamagedGoods(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportsService.getDamagedGoodsReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async exportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { reportType, format, startDate, endDate, groupBy } = req.query;
      const businessId = req.user!.businessId;

      let headers: string[] = [];
      let rows: any[][] = [];
      let sheetName = 'Report';

      switch (reportType) {
        case 'overview': {
          sheetName = 'Overview_Report';
          const data = await ReportsService.getOverviewReport(businessId, startDate as string, endDate as string);
          headers = ['Metric', 'Value'];
          rows = [
            ['Gross Sales Revenue (Before Discounts)', data.revenue + data.discount],
            ['Total Discounts Given', data.discount],
            ['Net Sales Revenue', data.revenue],
            ['COGS', data.cogs],
            ['Gross Profit', data.grossProfit],
            ['Gross Margin (%)', data.grossMargin.toFixed(2)],
            ['Expenses', data.expenses],
            ['Damaged Cost Loss', data.damagedCost],
            ['Net Profit', data.netProfit],
            ['Sales Count', data.salesCount],
            ['Average Basket', data.averageBasket],
            ['Total Unpaid Credit', data.totalUnpaidCredit],
            ['Purchases', data.purchases],
            ['Cash Payments', data.paymentsBreakdown.CASH],
            ['Mpesa Payments', data.paymentsBreakdown.MPESA],
          ];
          break;
        }
        case 'sales': {
          sheetName = 'Sales_Report';
          const report = await ReportsService.getProductSalesReport(businessId, {
            startDate: startDate as string,
            endDate: endDate as string
          });
          headers = ['Date Sold', 'Product Name', 'SKU', 'Payment Method', 'Quantity', 'Unit Cost Price (KES)', 'Unit Selling Price (KES)', 'Total Cost (KES)', 'Total Selling (KES)', 'Profit Made (KES)'];
          rows = report.items.map((r: any) => [
            new Date(r.soldAt).toLocaleString(),
            r.productName,
            r.sku || '',
            r.paymentMethod || 'CASH',
            r.quantity,
            r.costPrice,
            r.sellingPrice,
            r.totalCost,
            r.totalSelling,
            r.profit
          ]);
          rows.push([
            'GRAND TOTAL',
            '',
            '',
            '',
            report.totals.totalQuantity,
            '',
            '',
            report.totals.totalCost,
            report.totals.totalSelling,
            report.totals.totalProfit
          ]);
          break;
        }
        case 'profit-loss': {
          sheetName = 'Profit_Loss_Statement';
          const data = await ReportsService.getProfitLossReport(businessId, startDate as string, endDate as string);
          headers = ['Line Item', 'Amount (KES)'];
          rows = [
            ['Gross Sales Revenue (Before Discounts)', data.grossRevenue],
            ['Minus Discounts Given', -data.discount],
            ['Minus Refunds / Returns', -data.refunds],
            ['Net Sales Revenue', data.netRevenue],
            ['Minus Cost of Goods Sold (COGS)', -data.cogs],
            ['Gross Profit Margin', data.grossProfit],
            ['Minus Damaged Goods Loss', -data.damagedLoss],
            ['Total Operating Expenses', -data.totalExpenses],
            ...data.expenses.map(e => [`Expense: ${e.category}`, -e.amount]),
            ['Net Operating Profit', data.netProfit]
          ];
          break;
        }
        case 'inventory': {
          sheetName = 'Inventory_Valuation';
          const data = await ReportsService.getInventoryReport(businessId);
          headers = ['Valuation Metric', 'Value'];
          rows = [
            ['Total Asset Value (Cost Price)', data.assetValueCost],
            ['Total Asset Value (Selling Price)', data.assetValueRetail],
            ['Potential Profit Margin', data.potentialProfit],
            ['Low Stock Items Count', data.lowStockCount],
            ['Out of Stock Items Count', data.outOfStockCount]
          ];
          break;
        }
        case 'customers': {
          sheetName = 'Customer_Rankings';
          const data = await ReportsService.getCustomerReport(businessId, startDate as string, endDate as string);
          headers = ['Customer Name', 'Phone Number', 'Total Spent (KES)', 'Visits Count', 'Current Outstanding Debt'];
          rows = data.rankings.map(r => [r.name, r.phone || 'N/A', Number(r.totalSpent), r.visitCount, Number(r.unpaidDebt)]);
          break;
        }
        case 'credit': {
          sheetName = 'Credit_Aging';
          const data = await ReportsService.getCreditReport(businessId);
          headers = ['Customer Name', 'Phone', 'Total Outstanding Credit', '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];
          rows = data.customers.map(c => [
            c.customerName, c.customerPhone || 'N/A', c.totalUnpaid, c.bucket_0_30, c.bucket_31_60, c.bucket_61_90, c.bucket_90_plus
          ]);
          break;
        }
        case 'suppliers': {
          sheetName = 'Supplier_Purchases';
          const data = await ReportsService.getSupplierReport(businessId, startDate as string, endDate as string);
          headers = ['Supplier Name', 'Phone', 'Total Purchases (KES)', 'Amount Paid (KES)', 'Outstanding Balance', 'Purchase Count'];
          rows = data.suppliers.map(s => [s.name, s.phone || 'N/A', s.totalPurchases, s.amountPaid, s.outstandingBalance, s.purchaseCount]);
          break;
        }
        case 'mpesa': {
          sheetName = 'Mpesa_Performance';
          const data = await ReportsService.getMpesaReport(businessId, startDate as string, endDate as string);
          headers = ['M-Pesa metric', 'Value'];
          rows = [
            ['Total Collections (KES)', data.collectedAmount],
            ['Total Tx Requests', data.totalCount],
            ['Completed Transactions', data.completedCount],
            ['Failed Transactions', data.failedCount],
            ['Pending Transactions', data.pendingCount],
            ['Success Rate (%)', data.successRate.toFixed(2)],
          ];
          break;
        }
        case 'refunds': {
          sheetName = 'Refunds_Report';
          const data = await ReportsService.getRefundReport(businessId, startDate as string, endDate as string);
          headers = ['Refund Detail / Item', 'Refund Count / Quantity', 'Total Amount / Value (KES)'];
          rows = [
            ['Overall Refunds Summary', data.refundCount, data.totalRefunded],
            ...data.items.map(item => [`Item: ${item.productName} (${item.variantName})`, Number(item.quantityRefunded), Number(item.totalValue)])
          ];
          break;
        }
        case 'damaged':
        case 'damaged-goods': {
          sheetName = 'Damaged_Goods_Report';
          const data = await ReportsService.getDamagedGoodsReport(businessId, startDate as string, endDate as string);
          headers = ['Product (Variant)', 'SKU', 'Quantity Damaged', 'Cost Price (KES)', 'Total Cost Loss (KES)', 'Reason'];
          rows = data.items.map(i => [
            `${i.productName} (${i.variantName})`, i.sku || 'N/A', Number(i.quantity), Number(i.costPrice), Number(i.totalCost), i.reason || 'No reason'
          ]);
          break;
        }
        default:
          return res.status(400).json({ status: 'error', message: 'Invalid report type' });
      }

      if (format === 'excel') {
        const xmlContent = ReportsService.generateExcelXML(sheetName, headers, rows);
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename="${sheetName}_${new Date().toISOString().split('T')[0]}.xls"`);
        return res.status(200).send(xmlContent);
      } 
      
      if (format === 'pdf') {
        // We generate a clean, modern HTML Print view styling that the browser's PDF engine prints beautifully
        const tableHeader = headers.map(h => `<th style="background-color: #6d4c41; color: white; padding: 10px; text-align: left; font-size: 13px;">${h}</th>`).join('');
        const tableRows = rows.map((row, idx) => {
          const cells = row.map(cell => `<td style="padding: 10px; border-bottom: 1px solid #e0e0e0; font-size: 13px;">${cell}</td>`).join('');
          const bg = idx % 2 === 0 ? '#fcfaf9' : '#ffffff';
          return `<tr style="background-color: ${bg};">${cells}</tr>`;
        }).join('');

        const htmlReport = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${sheetName.replace(/_/g, ' ')}</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #3e2723; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6d4c brown; padding-bottom: 10px; }
                .header h1 { margin: 5px 0; color: #5d4037; font-size: 24px; }
                .header p { margin: 2px 0; color: #8d6e63; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #8d6e63; }
                @media print {
                  @page {
                    margin: 0;
                  }
                  body {
                    padding: 1.5cm;
                  }
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
                <button onclick="window.print()" style="background-color: #6d4c41; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Print / Save PDF</button>
              </div>
              <div class="header">
                <h1>${sheetName.replace(/_/g, ' ')}</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                ${startDate || endDate ? `<p>Date Range: ${startDate || 'Beginning'} to ${endDate || 'Present'}</p>` : ''}
              </div>
              <table>
                <thead>
                  <tr>${tableHeader}</tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
              <div class="footer">
                <p>Smart POS Platform Reports Module</p>
              </div>
              <script>
                // Auto prompt print dialog
                window.onload = function() {
                  // If opened in separate window/iframe
                  setTimeout(() => { window.print(); }, 500);
                }
              </script>
            </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(htmlReport);
      }

      // Default to CSV
      const csvContent = ReportsService.generateCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${sheetName}_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
