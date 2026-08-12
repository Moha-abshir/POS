import { eq, and, or, inArray, sql, desc, gte, lte, asc, sum, count, isNull, SQL } from 'drizzle-orm';
import { db } from '../../db';
import { 
  sales, saleItems, productVariants, variantUnits, customers, payments, 
  purchases, purchaseItems, damagedGoods, expenses, refunds, refundItems, 
  categories, products, suppliers, mpesaTransactions, businessMpesaAccounts, businesses
} from '../../db/schema';
import { getCache, setCache, flushPattern } from '../../core/cache/redis';

export class ReportsService {
  /**
   * Helper to parse string decimals from Drizzle to numbers
   */
  private static parseNum(val: any): number {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Helper to parse query parameters into start and end Date objects,
   * setting them to exact local date boundaries (00:00:00.000 for start and 23:59:59.999 for end)
   * so that filtering strictly respects local calendar dates without timezone leakage.
   */
  private static parseDateRange(startDate?: string, endDate?: string) {
    let start: Date;
    let end: Date;

    if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3) {
        start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      } else {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      const parts = endDate.split('-').map(Number);
      if (parts.length === 3) {
        end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      } else {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  /**
   * 1. Overview Report Service
   */
  static async getOverviewReport(businessId: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    // Setup date conditions
    const salesConditions = [eq(sales.businessId, businessId), gte(sales.soldAt, start), lte(sales.soldAt, end)];
    const expensesConditions = [eq(expenses.businessId, businessId), gte(expenses.expenseDate, start), lte(expenses.expenseDate, end), isNull(expenses.deletedAt)];
    const paymentsConditions = [eq(payments.businessId, businessId), gte(payments.paidAt, start), lte(payments.paidAt, end)];
    const purchasesConditions = [eq(purchases.businessId, businessId), gte(purchases.purchasedAt, start), lte(purchases.purchasedAt, end)];
    const damagedConditions = [eq(damagedGoods.businessId, businessId), gte(damagedGoods.damagedAt, start), lte(damagedGoods.damagedAt, end)];

    // Fetch gross sales aggregates
    const [salesSummary] = await db.select({
      totalRevenue: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(${sales.amountPaid}), 0)`,
      totalDiscount: sql<string>`COALESCE(SUM(${sales.discountAmount}), 0)`,
      salesCount: sql<number>`COUNT(${sales.id})::int`,
    })
    .from(sales)
    .where(and(...salesConditions));

    const totalRevenue = this.parseNum(salesSummary?.totalRevenue);
    const totalPaid = this.parseNum(salesSummary?.totalPaid);
    const totalDiscount = this.parseNum(salesSummary?.totalDiscount);
    const salesCount = salesSummary?.salesCount || 0;
    const totalUnpaid = Math.max(0, totalRevenue - totalPaid);
    const averageBasket = salesCount > 0 ? totalRevenue / salesCount : 0;

    // Fetch COGS by joining saleItems with sales
    const [cogsSummary] = await db.select({
      totalCogs: sql<string>`COALESCE(SUM(${saleItems.quantity} * ${saleItems.costPrice}), 0)`
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(...salesConditions));

    const totalCogs = this.parseNum(cogsSummary?.totalCogs);
    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Fetch payments summary by method
    const paymentMethodsSummary = await db.select({
      method: payments.method,
      totalAmount: sql<string>`COALESCE(SUM(${payments.amount}), 0)`
    })
    .from(payments)
    .where(and(...paymentsConditions, eq(payments.status, 'COMPLETED')))
    .groupBy(payments.method);

    const paymentsBreakdown = {
      CASH: 0,
      MPESA: 0
    };
    paymentMethodsSummary.forEach(row => {
      if (row.method === 'CASH') paymentsBreakdown.CASH = this.parseNum(row.totalAmount);
      if (row.method === 'MPESA') paymentsBreakdown.MPESA = this.parseNum(row.totalAmount);
    });

    // Fetch total expenses
    const [expensesSummary] = await db.select({
      totalExpenses: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`
    })
    .from(expenses)
    .where(and(...expensesConditions));
    const totalExpenses = this.parseNum(expensesSummary?.totalExpenses);

    // Fetch total purchases
    const [purchasesSummary] = await db.select({
      totalPurchases: sql<string>`COALESCE(SUM(${purchases.totalAmount}), 0)`
    })
    .from(purchases)
    .where(and(...purchasesConditions));
    const totalPurchases = this.parseNum(purchasesSummary?.totalPurchases);

    // Fetch total damaged goods valuation
    const [damagedSummary] = await db.select({
      totalDamagedValuation: sql<string>`COALESCE(SUM(${damagedGoods.quantity} * ${productVariants.costPrice}), 0)`
    })
    .from(damagedGoods)
    .innerJoin(productVariants, eq(damagedGoods.variantId, productVariants.id))
    .where(and(...damagedConditions));
    const totalDamagedCost = this.parseNum(damagedSummary?.totalDamagedValuation);

    // Net Profit calculation
    const netProfit = grossProfit - totalExpenses - totalDamagedCost;

    // Sales Trend by day
    const trendData = await db.select({
      date: sql<string>`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`,
      revenue: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      transactions: sql<number>`COUNT(${sales.id})::int`
    })
    .from(sales)
    .where(and(...salesConditions))
    .groupBy(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`)
    .orderBy(asc(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`));

    const formattedTrend = trendData.map(row => ({
      date: row.date,
      revenue: this.parseNum(row.revenue),
      transactions: row.transactions
    }));

    return {
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      grossMargin,
      netProfit,
      salesCount,
      averageBasket,
      totalUnpaidCredit: totalUnpaid,
      expenses: totalExpenses,
      purchases: totalPurchases,
      damagedCost: totalDamagedCost,
      discount: totalDiscount,
      paymentsBreakdown,
      trend: formattedTrend
    };
  }

  /**
   * 2. Sales Report Service (supporting daily, weekly, monthly, category, product, customer, and hourly grouping)
   */
  static async getSalesReport(businessId: string, options: { 
    startDate?: string; 
    endDate?: string; 
    groupBy?: 'day' | 'week' | 'month' | 'category' | 'product' | 'customer' | 'hour';
  }) {
    const { start, end } = this.parseDateRange(options.startDate, options.endDate);
    const groupBy = options.groupBy || 'day';

    const conditions = [eq(sales.businessId, businessId), gte(sales.soldAt, start), lte(sales.soldAt, end)];

    if (groupBy === 'day') {
      return await db.select({
        groupKey: sql<string>`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`,
        totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        transactionCount: sql<number>`COUNT(${sales.id})::int`,
        averageSale: sql<string>`COALESCE(AVG(${sales.totalAmount}), 0)`
      })
      .from(sales)
      .where(and(...conditions))
      .groupBy(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`)
      .orderBy(asc(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`));
    }

    if (groupBy === 'week') {
      return await db.select({
        groupKey: sql<string>`TO_CHAR(DATE_TRUNC('week', ${sales.soldAt}), 'YYYY-[W]IW')`,
        totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        transactionCount: sql<number>`COUNT(${sales.id})::int`,
        averageSale: sql<string>`COALESCE(AVG(${sales.totalAmount}), 0)`
      })
      .from(sales)
      .where(and(...conditions))
      .groupBy(sql`DATE_TRUNC('week', ${sales.soldAt}), TO_CHAR(DATE_TRUNC('week', ${sales.soldAt}), 'YYYY-[W]IW')`)
      .orderBy(asc(sql`DATE_TRUNC('week', ${sales.soldAt})`));
    }

    if (groupBy === 'month') {
      return await db.select({
        groupKey: sql<string>`TO_CHAR(${sales.soldAt}, 'YYYY-MM')`,
        totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        transactionCount: sql<number>`COUNT(${sales.id})::int`,
        averageSale: sql<string>`COALESCE(AVG(${sales.totalAmount}), 0)`
      })
      .from(sales)
      .where(and(...conditions))
      .groupBy(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM')`)
      .orderBy(asc(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM')`));
    }

    if (groupBy === 'category') {
      return await db.select({
        groupKey: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
        totalSales: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`,
        quantitySold: sql<string>`COALESCE(SUM(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .groupBy(categories.name)
      .orderBy(desc(sql`SUM(${saleItems.subtotal})`));
    }

    if (groupBy === 'product') {
      return await db.select({
        groupKey: sql<string>`CONCAT(${products.name}, ' (', ${productVariants.name}, ')')`,
        totalSales: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`,
        quantitySold: sql<string>`COALESCE(SUM(${saleItems.quantity}), 0)`
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(...conditions))
      .groupBy(products.name, productVariants.name)
      .orderBy(desc(sql`SUM(${saleItems.subtotal})`))
      .limit(100);
    }

    if (groupBy === 'customer') {
      return await db.select({
        groupKey: sql<string>`COALESCE(${customers.name}, 'Walk-in Customer')`,
        totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        transactionCount: sql<number>`COUNT(${sales.id})::int`
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(and(...conditions))
      .groupBy(customers.name)
      .orderBy(desc(sql`SUM(${sales.totalAmount})`))
      .limit(100);
    }

    if (groupBy === 'hour') {
      return await db.select({
        groupKey: sql<string>`TO_CHAR(${sales.soldAt}, 'HH24:00')`,
        totalSales: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        transactionCount: sql<number>`COUNT(${sales.id})::int`
      })
      .from(sales)
      .where(and(...conditions))
      .groupBy(sql`TO_CHAR(${sales.soldAt}, 'HH24:00')`)
      .orderBy(asc(sql`TO_CHAR(${sales.soldAt}, 'HH24:00')`));
    }

    return [];
  }

  /**
   * Detailed Product Sales Report (Date Sold, Product Name, Unit Cost, Unit Selling, Total Cost, Total Selling, Profit)
   * Cached in Redis with TTL 900s (15 min) per business and date range.
   */
  static async getProductSalesReport(businessId: string, options: { startDate?: string; endDate?: string; search?: string; paymentMethod?: string }) {
    const { start, end } = this.parseDateRange(options.startDate, options.endDate);
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    const search = (options.search || '').trim().toLowerCase();
    const paymentMethod = (options.paymentMethod || 'ALL').trim().toUpperCase();

    const cacheKey = `cache:${businessId}:reports:product_sales:${startStr}:${endStr}:${paymentMethod}`;

    // 1. Try Redis cache first (only if no inline search filter)
    if (!search) {
      try {
        const cached = await getCache(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis read error on getProductSalesReport:', err);
      }
    }

    // 2. Fetch business productMode
    const [biz] = await db.select({ productMode: businesses.productMode }).from(businesses).where(eq(businesses.id, businessId)).limit(1);
    const isSimpleMode = biz?.productMode === 'SIMPLE';

    // 3. Query DB
    const conditions: SQL<unknown>[] = [
      eq(sales.businessId, businessId),
      gte(sales.soldAt, start),
      lte(sales.soldAt, end)
    ];

    const creditCondition = or(
      eq(sales.paymentMethod, 'CREDIT'),
      inArray(sales.paymentStatus, ['UNPAID', 'PARTIAL']),
      sql`CAST(${sales.totalAmount} AS numeric) > CAST(${sales.amountPaid} AS numeric)`
    );

    if (paymentMethod && paymentMethod !== 'ALL') {
      if (paymentMethod === 'CREDIT' || paymentMethod === 'CREDIT_SALES') {
        if (creditCondition) conditions.push(creditCondition);
      } else if (paymentMethod === 'CASH' || paymentMethod === 'CASH_SALES') {
        conditions.push(
          eq(sales.paymentStatus, 'PAID'),
          sql`CAST(${sales.amountPaid} AS numeric) >= CAST(${sales.totalAmount} AS numeric)`,
          sql`(${sales.paymentMethod} IS NULL OR ${sales.paymentMethod} = 'CASH' OR ${sales.paymentMethod} != 'CREDIT')`
        );
      } else if (paymentMethod === 'MPESA') {
        conditions.push(eq(sales.paymentMethod, 'MPESA'));
      } else if (paymentMethod === 'SPLIT') {
        conditions.push(eq(sales.paymentMethod, 'SPLIT'));
      } else {
        conditions.push(eq(sales.paymentMethod, paymentMethod as any));
      }
    }

    const rows = await db.select({
      id: saleItems.id,
      soldAt: sales.soldAt,
      paymentMethod: sales.paymentMethod,
      paymentStatus: sales.paymentStatus,
      totalAmount: sales.totalAmount,
      amountPaid: sales.amountPaid,
      productName: products.name,
      variantName: productVariants.name,
      unitName: variantUnits.name,
      sku: productVariants.sku,
      quantity: saleItems.quantity,
      costPrice: saleItems.costPrice,
      sellingPrice: saleItems.sellingPrice,
      subtotal: saleItems.subtotal,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(variantUnits, eq(saleItems.unitId, variantUnits.id))
    .where(and(...conditions))
    .orderBy(desc(sales.soldAt));

    // Map & calculate fields
    const formattedRows = rows.map((r) => {
      const qty = Number(r.quantity) || 0;
      const cost = Number(r.costPrice) || 0;
      const selling = Number(r.sellingPrice) || 0;
      const totalCost = qty * cost;
      const totalSelling = Number(r.subtotal) || (qty * selling);
      const profit = totalSelling - totalCost;

      const isCredit = 
        r.paymentMethod === 'CREDIT' || 
        r.paymentStatus === 'UNPAID' || 
        r.paymentStatus === 'PARTIAL' || 
        Number(r.totalAmount) > Number(r.amountPaid);

      const effectivePaymentMethod = isCredit 
        ? 'CREDIT' 
        : (r.paymentMethod === 'MPESA' ? 'MPESA' : r.paymentMethod === 'SPLIT' ? 'SPLIT' : 'CASH');

      const fullProductName = isSimpleMode
        ? r.productName
        : `${r.productName}${r.variantName && r.variantName !== 'Default' && r.variantName !== 'Standard' ? ` (${r.variantName})` : ''}${r.unitName && r.unitName !== 'piece' && r.unitName !== 'default' ? ` • ${r.unitName}` : ''}`;

      return {
        id: r.id,
        soldAt: r.soldAt,
        paymentMethod: effectivePaymentMethod,
        productName: fullProductName,
        rawProductName: r.productName,
        sku: r.sku || '',
        quantity: qty,
        costPrice: cost,
        sellingPrice: selling,
        totalCost,
        totalSelling,
        profit
      };
    });

    // Compute grand totals
    const grandTotals = formattedRows.reduce(
      (acc, curr) => {
        acc.totalQuantity += curr.quantity;
        acc.totalCost += curr.totalCost;
        acc.totalSelling += curr.totalSelling;
        acc.totalProfit += curr.profit;
        return acc;
      },
      { totalQuantity: 0, totalCost: 0, totalSelling: 0, totalProfit: 0 }
    );

    const result = {
      items: formattedRows,
      totals: grandTotals,
      isSimpleMode
    };

    // Cache result in Redis for 15 mins
    if (!search) {
      try {
        await setCache(cacheKey, JSON.stringify(result), 900);
      } catch (err) {
        console.error('Redis write error on getProductSalesReport:', err);
      }
    }

    return result;
  }

  static async invalidateReportCache(businessId: string) {
    try {
      await flushPattern(`cache:${businessId}:reports:*`);
    } catch (err) {
      console.error(`Error invalidating report cache for business ${businessId}:`, err);
    }
  }

  /**
   * 3. Profit & Loss Service
   */
  static async getProfitLossReport(businessId: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    const salesConditions = [eq(sales.businessId, businessId), gte(sales.soldAt, start), lte(sales.soldAt, end)];
    const expensesConditions = [eq(expenses.businessId, businessId), gte(expenses.expenseDate, start), lte(expenses.expenseDate, end), isNull(expenses.deletedAt)];
    const damagedConditions = [eq(damagedGoods.businessId, businessId), gte(damagedGoods.damagedAt, start), lte(damagedGoods.damagedAt, end)];
    const refundConditions = [eq(refunds.businessId, businessId), gte(refunds.refundedAt, start), lte(refunds.refundedAt, end)];

    // Revenue
    const [salesSummary] = await db.select({
      totalRevenue: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      totalDiscount: sql<string>`COALESCE(SUM(${sales.discountAmount}), 0)`
    })
    .from(sales)
    .where(and(...salesConditions));
    const netSales = this.parseNum(salesSummary?.totalRevenue);
    const totalDiscount = this.parseNum(salesSummary?.totalDiscount);
    const grossRevenue = netSales + totalDiscount;

    // Refunds
    const [refundsSummary] = await db.select({
      totalRefunds: sql<string>`COALESCE(SUM(${refunds.totalAmount}), 0)`
    })
    .from(refunds)
    .where(and(...refundConditions));
    const totalRefunds = this.parseNum(refundsSummary?.totalRefunds);

    const netRevenue = grossRevenue - totalDiscount - totalRefunds;

    // COGS
    const [cogsSummary] = await db.select({
      totalCogs: sql<string>`COALESCE(SUM(${saleItems.quantity} * ${saleItems.costPrice}), 0)`
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(...salesConditions));
    const cogs = this.parseNum(cogsSummary?.totalCogs);

    // Gross Profit
    const grossProfit = netRevenue - cogs;

    // Damaged Goods Loss
    const [damagedSummary] = await db.select({
      totalCost: sql<string>`COALESCE(SUM(${damagedGoods.quantity} * ${productVariants.costPrice}), 0)`
    })
    .from(damagedGoods)
    .innerJoin(productVariants, eq(damagedGoods.variantId, productVariants.id))
    .where(and(...damagedConditions));
    const damagedLoss = this.parseNum(damagedSummary?.totalCost);

    // Expenses Grouped by Category
    const expensesGrouped = await db.select({
      category: expenses.category,
      totalAmount: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`
    })
    .from(expenses)
    .where(and(...expensesConditions))
    .groupBy(expenses.category)
    .orderBy(desc(sql`SUM(${expenses.amount})`));

    const formattedExpenses = expensesGrouped.map(row => ({
      category: row.category,
      amount: this.parseNum(row.totalAmount)
    }));

    const totalExpenses = formattedExpenses.reduce((sum, item) => sum + item.amount, 0);

    const netProfit = grossProfit - damagedLoss - totalExpenses;

    return {
      grossRevenue,
      discount: totalDiscount,
      refunds: totalRefunds,
      netRevenue,
      cogs,
      grossProfit,
      damagedLoss,
      expenses: formattedExpenses,
      totalExpenses,
      netProfit
    };
  }

  /**
   * 4. Inventory Report Service (Asset value, low-stock, and turn metrics)
   */
  static async getInventoryReport(businessId: string) {
    // Valuation based on variant current stock and cost price
    const [valuationSummary] = await db.select({
      totalAssetValueCost: sql<string>`COALESCE(SUM(${productVariants.baseStockQuantity} * ${productVariants.costPrice}), 0)`,
      lowStockCount: sql<number>`COUNT(CASE WHEN ${productVariants.baseStockQuantity} <= ${productVariants.lowStockThreshold} AND ${productVariants.isActive} = true THEN 1 END)::int`,
      outOfStockCount: sql<number>`COUNT(CASE WHEN ${productVariants.baseStockQuantity} = 0 AND ${productVariants.isActive} = true THEN 1 END)::int`
    })
    .from(productVariants)
    .where(eq(productVariants.businessId, businessId));

    // Valuation based on default unit selling price
    const [retailValuationSummary] = await db.select({
      totalAssetValueRetail: sql<string>`COALESCE(SUM(${productVariants.baseStockQuantity} * ${variantUnits.sellingPrice}), 0)`
    })
    .from(productVariants)
    .innerJoin(variantUnits, and(eq(productVariants.id, variantUnits.variantId), eq(variantUnits.isDefault, true)))
    .where(eq(productVariants.businessId, businessId));

    const assetValueCost = this.parseNum(valuationSummary?.totalAssetValueCost);
    const assetValueRetail = this.parseNum(retailValuationSummary?.totalAssetValueRetail);
    const potentialProfit = Math.max(0, assetValueRetail - assetValueCost);

    // Top 10 Fast Moving Items (based on quantity sold in last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const fastMoving = await db.select({
      variantId: productVariants.id,
      productName: products.name,
      variantName: productVariants.name,
      sku: productVariants.sku,
      quantitySold: sql<string>`COALESCE(SUM(${saleItems.quantity}), 0)`,
      revenue: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(
      eq(sales.businessId, businessId),
      gte(sales.soldAt, ninetyDaysAgo)
    ))
    .groupBy(productVariants.id, products.name, productVariants.name, productVariants.sku)
    .orderBy(desc(sql`SUM(${saleItems.quantity})`))
    .limit(10);

    // 10 Slow Moving Items (variants with low or zero sales in the last 90 days)
    const slowMoving = await db.select({
      variantId: productVariants.id,
      productName: products.name,
      variantName: productVariants.name,
      sku: productVariants.sku,
      currentStock: productVariants.baseStockQuantity,
      quantitySold: sql<string>`COALESCE(SUM(${saleItems.quantity}), 0)`
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(saleItems, eq(productVariants.id, saleItems.variantId))
    .leftJoin(sales, and(eq(saleItems.saleId, sales.id), gte(sales.soldAt, ninetyDaysAgo)))
    .where(eq(productVariants.businessId, businessId))
    .groupBy(productVariants.id, products.name, productVariants.name, productVariants.sku, productVariants.baseStockQuantity)
    .orderBy(asc(sql`COALESCE(SUM(${saleItems.quantity}), 0)`))
    .limit(10);

    return {
      assetValueCost,
      assetValueRetail,
      potentialProfit,
      lowStockCount: valuationSummary?.lowStockCount || 0,
      outOfStockCount: valuationSummary?.outOfStockCount || 0,
      fastMoving,
      slowMoving
    };
  }

  /**
   * 5. Customer Report Service
   */
  static async getCustomerReport(businessId: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    // Rank customers by balance or total spent
    const customerList = await db.select({
      customerId: customers.id,
      name: customers.name,
      phone: customers.phone,
      balance: customers.balance,
      totalSpent: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      visitCount: sql<number>`COUNT(${sales.id})::int`,
    })
    .from(customers)
    .leftJoin(sales, and(eq(sales.customerId, customers.id), gte(sales.soldAt, start), lte(sales.soldAt, end)))
    .where(and(eq(customers.businessId, businessId), eq(customers.isActive, true)))
    .groupBy(customers.id, customers.name, customers.phone, customers.balance)
    .orderBy(desc(sql`CAST(${customers.balance} AS numeric)`), desc(sql`COALESCE(SUM(${sales.totalAmount}), 0)`))
    .limit(500);

    // Sum of all outstanding customer credit balances for this specific business
    const [totalOutstandingCredit] = await db.select({
      total: sql<string>`COALESCE(SUM(CAST(${customers.balance} AS numeric)), 0)`
    })
    .from(customers)
    .where(and(eq(customers.businessId, businessId), eq(customers.isActive, true)));

    const rankings = customerList.map(c => ({
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      totalSpent: this.parseNum(c.totalSpent),
      visitCount: c.visitCount,
      unpaidDebt: c.balance
    }));

    return {
      totalOutstandingCredit: this.parseNum(totalOutstandingCredit?.total),
      rankings
    };
  }

  /**
   * 6. Credit Aging Buckets Report Service
   */
  static async getCreditReport(businessId: string) {
    // Include all active customers in this business with a positive balance
    const customerRecords = await db.select({
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
      balance: customers.balance,
      periodOwed: customers.periodOwed
    })
    .from(customers)
    .where(and(
      eq(customers.businessId, businessId),
      eq(customers.isActive, true),
      sql`CAST(${customers.balance} AS numeric) > 0`
    ))
    .orderBy(desc(sql`CAST(${customers.balance} AS numeric)`));

    let totalUnpaidSum = 0;
    let b0_30Sum = 0;
    let b31_60Sum = 0;
    let b61_90Sum = 0;
    let b90PlusSum = 0;

    const formattedAging = customerRecords.map(row => {
      const balance = Number(row.balance) || 0;
      totalUnpaidSum += balance;

      let b0 = 0, b30 = 0, b60 = 0, b90 = 0;
      const period = (row.periodOwed || '').toLowerCase();

      if (period.includes('30 to 60') || period.includes('31-60') || period.includes('31 to 60')) {
        b30 = balance;
        b31_60Sum += balance;
      } else if (period.includes('61-90') || period.includes('60 to 90') || period.includes('61 to 90')) {
        b60 = balance;
        b61_90Sum += balance;
      } else if (period.includes('90') || period.includes('above 90')) {
        b90 = balance;
        b90PlusSum += balance;
      } else {
        b0 = balance;
        b0_30Sum += balance;
      }

      return {
        customerId: row.customerId,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        totalUnpaid: balance,
        bucket_0_30: b0,
        bucket_31_60: b30,
        bucket_61_90: b60,
        bucket_90_plus: b90
      };
    });

    return {
      summary: {
        totalOutstanding: totalUnpaidSum,
        bucket_0_30: b0_30Sum,
        bucket_31_60: b31_60Sum,
        bucket_61_90: b61_90Sum,
        bucket_90_plus: b90PlusSum
      },
      customers: formattedAging
    };
  }

  /**
   * 7. Supplier Purchase & Debt Report Service
   */
  static async getSupplierReport(businessId: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    const conditions = [eq(purchases.businessId, businessId), gte(purchases.purchasedAt, start), lte(purchases.purchasedAt, end)];

    const supplierPurchases = await db.select({
      supplierId: suppliers.id,
      name: suppliers.name,
      phone: suppliers.phone,
      totalPurchases: sql<string>`COALESCE(SUM(${purchases.totalAmount}), 0)`,
      amountPaid: sql<string>`COALESCE(SUM(${purchases.amountPaid}), 0)`,
      balance: suppliers.balance,
      purchaseCount: sql<number>`COUNT(${purchases.id})::int`
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(and(...conditions))
    .groupBy(suppliers.id, suppliers.name, suppliers.phone, suppliers.balance)
    .orderBy(desc(sql`SUM(${purchases.totalAmount})`));

    // Overall metrics
    const [supplierDebtSummary] = await db.select({
      totalDebt: sql<string>`COALESCE(SUM(${suppliers.balance}), 0)`
    })
    .from(suppliers)
    .where(eq(suppliers.businessId, businessId));

    return {
      totalSupplierDebt: this.parseNum(supplierDebtSummary?.totalDebt),
      suppliers: supplierPurchases.map(row => ({
        supplierId: row.supplierId,
        name: row.name,
        phone: row.phone,
        totalPurchases: this.parseNum(row.totalPurchases),
        amountPaid: this.parseNum(row.amountPaid),
        outstandingBalance: this.parseNum(row.balance),
        purchaseCount: row.purchaseCount
      }))
    };
  }

  /**
   * 8. M-Pesa Performance & Collection Metrics
   */
  static async getMpesaReport(businessId: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    // Query collections via mpesaTransactions table
    // Fetch transaction codes and status breakdowns
    const txs = await db.select({
      status: mpesaTransactions.status,
      count: sql<number>`COUNT(${mpesaTransactions.id})::int`,
      totalAmount: sql<string>`COALESCE(SUM(${mpesaTransactions.amount}), 0)`
    })
    .from(mpesaTransactions)
    .innerJoin(businessMpesaAccounts, eq(mpesaTransactions.mpesaAccountId, businessMpesaAccounts.id))
    .where(and(
      eq(businessMpesaAccounts.businessId, businessId),
      gte(mpesaTransactions.createdAt, start),
      lte(mpesaTransactions.createdAt, end)
    ))
    .groupBy(mpesaTransactions.status);

    let totalCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let collectedAmount = 0;

    txs.forEach(row => {
      const c = row.count || 0;
      totalCount += c;
      if (row.status === 'COMPLETED') {
        completedCount = c;
        collectedAmount = this.parseNum(row.totalAmount);
      } else if (row.status === 'FAILED') {
        failedCount = c;
      } else if (row.status === 'PENDING') {
        pendingCount = c;
      }
    });

    const successRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Collections grouped by Account (Till vs Paybill details)
    const accountBreakdown = await db.select({
      accountName: businessMpesaAccounts.accountName,
      accountType: businessMpesaAccounts.accountType,
      shortcode: businessMpesaAccounts.shortcode,
      totalCollected: sql<string>`COALESCE(SUM(CASE WHEN ${mpesaTransactions.status} = 'COMPLETED' THEN ${mpesaTransactions.amount} ELSE 0 END), 0)`,
      totalCount: sql<number>`COUNT(${mpesaTransactions.id})::int`,
      successCount: sql<number>`COUNT(CASE WHEN ${mpesaTransactions.status} = 'COMPLETED' THEN 1 END)::int`
    })
    .from(mpesaTransactions)
    .innerJoin(businessMpesaAccounts, eq(mpesaTransactions.mpesaAccountId, businessMpesaAccounts.id))
    .where(and(
      eq(businessMpesaAccounts.businessId, businessId),
      gte(mpesaTransactions.createdAt, start),
      lte(mpesaTransactions.createdAt, end)
    ))
    .groupBy(businessMpesaAccounts.id, businessMpesaAccounts.accountName, businessMpesaAccounts.accountType, businessMpesaAccounts.shortcode)
    .orderBy(desc(sql`SUM(CASE WHEN ${mpesaTransactions.status} = 'COMPLETED' THEN ${mpesaTransactions.amount} ELSE 0 END)`));

    const formattedAccounts = accountBreakdown.map(row => ({
      accountName: row.accountName,
      accountType: row.accountType,
      shortcode: row.shortcode,
      collectedAmount: this.parseNum(row.totalCollected),
      transactionCount: row.totalCount || 0,
      successRate: (row.totalCount || 0) > 0 ? ((row.successCount || 0) / (row.totalCount || 0)) * 100 : 0
    }));

    return {
      collectedAmount,
      totalCount,
      completedCount,
      failedCount,
      pendingCount,
      successRate,
      accounts: formattedAccounts
    };
  }

  /**
   * 9. Refunds Report Service
   */
  static async getRefundReport(businessId: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    const conditions = [eq(refunds.businessId, businessId), gte(refunds.refundedAt, start), lte(refunds.refundedAt, end)];

    const [summary] = await db.select({
      totalRefunded: sql<string>`COALESCE(SUM(${refunds.totalAmount}), 0)`,
      refundCount: sql<number>`COUNT(${refunds.id})::int`
    })
    .from(refunds)
    .where(and(...conditions));

    // Refunded items details
    const items = await db.select({
      productName: products.name,
      variantName: productVariants.name,
      quantityRefunded: sql<string>`COALESCE(SUM(${refundItems.quantity}), 0)`,
      totalValue: sql<string>`COALESCE(SUM(${refundItems.subtotal}), 0)`
    })
    .from(refundItems)
    .innerJoin(refunds, eq(refundItems.refundId, refunds.id))
    .innerJoin(productVariants, eq(refundItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(...conditions))
    .groupBy(products.name, productVariants.name)
    .orderBy(desc(sql`SUM(${refundItems.subtotal})`));

    return {
      totalRefunded: this.parseNum(summary?.totalRefunded),
      refundCount: summary?.refundCount || 0,
      items
    };
  }

  /**
   * 10. Damaged Goods Report Service
   */
  static async getDamagedGoodsReport(businessId: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    const conditions = [eq(damagedGoods.businessId, businessId), gte(damagedGoods.damagedAt, start), lte(damagedGoods.damagedAt, end)];

    // Aggregates
    const [summary] = await db.select({
      totalCost: sql<string>`COALESCE(SUM(${damagedGoods.quantity} * ${productVariants.costPrice}), 0)`,
      totalQuantity: sql<string>`COALESCE(SUM(${damagedGoods.quantity}), 0)`,
      eventCount: sql<number>`COUNT(${damagedGoods.id})::int`
    })
    .from(damagedGoods)
    .innerJoin(productVariants, eq(damagedGoods.variantId, productVariants.id))
    .where(and(...conditions));

    // Damaged items list
    const items = await db.select({
      productName: products.name,
      variantName: productVariants.name,
      sku: productVariants.sku,
      quantity: sql<string>`COALESCE(SUM(${damagedGoods.quantity}), 0)`,
      costPrice: productVariants.costPrice,
      totalCost: sql<string>`COALESCE(SUM(${damagedGoods.quantity} * ${productVariants.costPrice}), 0)`,
      reason: sql<string>`MAX(${damagedGoods.reason})`
    })
    .from(damagedGoods)
    .innerJoin(productVariants, eq(damagedGoods.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(...conditions))
    .groupBy(products.name, productVariants.name, productVariants.sku, productVariants.costPrice)
    .orderBy(desc(sql`SUM(${damagedGoods.quantity} * ${productVariants.costPrice})`));

    return {
      totalCost: this.parseNum(summary?.totalCost),
      totalQuantity: this.parseNum(summary?.totalQuantity),
      eventCount: summary?.eventCount || 0,
      items
    };
  }

  /**
   * 11. Export Format Generator Helpers (CSV, XML Excel)
   */
  static generateCSV(headers: string[], rows: any[][]): string {
    // UTF-8 BOM prefix to force Excel to parse it as UTF-8
    const bom = '\ufeff';
    const csvContent = rows.map(row => 
      row.map(val => {
        if (val === null || val === undefined) return '""';
        const strVal = String(val).replace(/"/g, '""'); // escape double quotes
        return `"${strVal}"`;
      }).join(',')
    ).join('\r\n');
    return bom + headers.join(',') + '\r\n' + csvContent;
  }

  static generateExcelXML(sheetName: string, headers: string[], rows: any[][]): string {
    const headerRow = headers.map(h => `<Cell><Data ss:Type="String">${h.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('');
    const bodyRows = rows.map(row => {
      const cells = row.map(cell => {
        const isNum = typeof cell === 'number';
        const type = isNum ? 'Number' : 'String';
        const cleanVal = isNum ? cell : String(cell === null || cell === undefined ? '' : cell)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<Cell><Data ss:Type="${type}">${cleanVal}</Data></Cell>`;
      }).join('');
      return `<Row>${cells}</Row>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F81BD" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName}">
  <Table>
   <Row ss:StyleID="Header">
    ${headerRow}
   </Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
  }
}
