import { db } from '../../db';
import { sales, saleItems, productVariants, products, customers, suppliers, stockMovements } from '../../db/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

export class DashboardService {
  static async getSummary(businessId: string) {
    const now = new Date();
    
    // Today Start (local day start)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Yesterday Start
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Yesterday matching hour endpoint
    const yesterdayMatchingEnd = new Date(now);
    yesterdayMatchingEnd.setDate(yesterdayMatchingEnd.getDate() - 1);

    // Seven days ago including today
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // 1. Subquery to calculate COGS per sale
    const cogsSubquery = db.select({
      saleId: saleItems.saleId,
      cogs: sql<string>`SUM(${saleItems.quantity} * ${saleItems.costPrice})`.as('cogs')
    })
    .from(saleItems)
    .groupBy(saleItems.saleId)
    .as('cogs_sub');

    // 2. Fetch Today's stats
    const [todaySummary] = await db.select({
      revenue: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      cogs: sql<string>`COALESCE(SUM(${cogsSubquery.cogs}), 0)`,
      transactions: sql<number>`COUNT(${sales.id})::int`
    })
    .from(sales)
    .leftJoin(cogsSubquery, eq(sales.id, cogsSubquery.saleId))
    .where(
      and(
        eq(sales.businessId, businessId),
        gte(sales.soldAt, todayStart)
      )
    );

    const todayRevenue = Number(todaySummary?.revenue || 0);
    const todayCogs = Number(todaySummary?.cogs || 0);
    const todayProfit = todayRevenue - todayCogs;
    const todayTransactions = todaySummary?.transactions || 0;

    // 3. Fetch Yesterday's stats up to matching hour
    const [yesterdaySummary] = await db.select({
      revenue: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      cogs: sql<string>`COALESCE(SUM(${cogsSubquery.cogs}), 0)`,
      transactions: sql<number>`COUNT(${sales.id})::int`
    })
    .from(sales)
    .leftJoin(cogsSubquery, eq(sales.id, cogsSubquery.saleId))
    .where(
      and(
        eq(sales.businessId, businessId),
        gte(sales.soldAt, yesterdayStart),
        sql`${sales.soldAt} <= ${yesterdayMatchingEnd}`
      )
    );

    const yesterdayRevenue = Number(yesterdaySummary?.revenue || 0);
    const yesterdayCogs = Number(yesterdaySummary?.cogs || 0);
    const yesterdayProfit = yesterdayRevenue - yesterdayCogs;
    const yesterdayTransactions = yesterdaySummary?.transactions || 0;

    // Calculate changes
    const calculateChange = (todayVal: number, yesterdayVal: number) => {
      if (yesterdayVal === 0) return todayVal > 0 ? 100 : 0;
      return ((todayVal - yesterdayVal) / yesterdayVal) * 100;
    };

    const revenueChange = calculateChange(todayRevenue, yesterdayRevenue);
    const profitChange = calculateChange(todayProfit, yesterdayProfit);
    const transactionsChange = calculateChange(todayTransactions, yesterdayTransactions);

    // 4. Low stock count
    const [lowStockSummary] = await db.select({
      count: sql<number>`COUNT(${productVariants.id})::int`
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.businessId, businessId),
        eq(productVariants.isActive, true),
        sql`${productVariants.baseStockQuantity} <= ${productVariants.lowStockThreshold}`
      )
    );
    const lowStockCount = lowStockSummary?.count || 0;

    // 5. Weekly Trend (last 7 days)
    const trendRows = await db.select({
      date: sql<string>`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`,
      revenue: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      cogs: sql<string>`COALESCE(SUM(${cogsSubquery.cogs}), 0)`
    })
    .from(sales)
    .leftJoin(cogsSubquery, eq(sales.id, cogsSubquery.saleId))
    .where(
      and(
        eq(sales.businessId, businessId),
        gte(sales.soldAt, sevenDaysAgo)
      )
    )
    .groupBy(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${sales.soldAt}, 'YYYY-MM-DD')`);

    // Make sure we have entries for all last 7 days even if no sales happened
    const weeklyTrendMap = new Map<string, { date: string; revenue: number; profit: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      weeklyTrendMap.set(dateString, { date: dateString, revenue: 0, profit: 0 });
    }

    trendRows.forEach(row => {
      const rev = Number(row.revenue);
      const prof = rev - Number(row.cogs);
      weeklyTrendMap.set(row.date, { date: row.date, revenue: rev, profit: prof });
    });

    const weeklySales = Array.from(weeklyTrendMap.values());

    // 6. Payment Methods Split (Today)
    const paymentRows = await db.select({
      method: sales.paymentMethod,
      total: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`
    })
    .from(sales)
    .where(
      and(
        eq(sales.businessId, businessId),
        gte(sales.soldAt, todayStart)
      )
    )
    .groupBy(sales.paymentMethod);

    const paymentSplit = paymentRows.map(row => ({
      method: row.method,
      value: Number(row.total)
    }));

    // 7. Low stock list details (top 5)
    const lowStockList = await db.select({
      id: productVariants.id,
      productName: products.name,
      variantName: productVariants.name,
      sku: productVariants.sku,
      stock: productVariants.baseStockQuantity,
      threshold: productVariants.lowStockThreshold
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(productVariants.businessId, businessId),
        eq(productVariants.isActive, true),
        sql`${productVariants.baseStockQuantity} <= ${productVariants.lowStockThreshold}`
      )
    )
    .orderBy(productVariants.baseStockQuantity)
    .limit(5);

    // 8. Recent Sales (last 5)
    const recentSales = await db.select({
      id: sales.id,
      customerName: sql<string>`COALESCE(${customers.name}, 'Walk-in Customer')`,
      totalAmount: sales.totalAmount,
      paymentMethod: sales.paymentMethod,
      paymentStatus: sales.paymentStatus,
      soldAt: sales.soldAt
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.businessId, businessId))
    .orderBy(desc(sales.soldAt))
    .limit(5);

    // 9. Recent Stock Movements (last 5)
    const recentMovements = await db.select({
      id: stockMovements.id,
      productName: products.name,
      variantName: productVariants.name,
      type: stockMovements.type,
      quantityChange: stockMovements.quantityChange,
      createdAt: stockMovements.createdAt
    })
    .from(stockMovements)
    .innerJoin(productVariants, eq(stockMovements.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(stockMovements.businessId, businessId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(5);

    // 10. Customer Credit & Supplier liabilities balances
    const [customerDebtSummary] = await db.select({
      total: sql<string>`COALESCE(SUM(${customers.balance}), 0)`
    })
    .from(customers)
    .where(
      and(
        eq(customers.businessId, businessId),
        sql`${customers.balance} > 0`
      )
    );

    const [supplierDebtSummary] = await db.select({
      total: sql<string>`COALESCE(SUM(${suppliers.balance}), 0)`
    })
    .from(suppliers)
    .where(
      and(
        eq(suppliers.businessId, businessId),
        sql`${suppliers.balance} > 0`
      )
    );

    return {
      kpis: {
        todayRevenue,
        revenueChangePercent: revenueChange,
        todayGrossProfit: todayProfit,
        profitChangePercent: profitChange,
        todaySalesCount: todayTransactions,
        salesCountChangePercent: transactionsChange,
        lowStockCount
      },
      charts: {
        weeklySales,
        paymentSplit
      },
      lowStockList,
      recentSales,
      debtSummary: {
        customerOutstanding: Number(customerDebtSummary?.total || 0),
        supplierLiabilities: Number(supplierDebtSummary?.total || 0)
      },
      recentMovements
    };
  }
}
