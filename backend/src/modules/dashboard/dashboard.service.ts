import { db } from '../../db';
import { sales, saleItems, productVariants, products, customers, suppliers, stockMovements, payments } from '../../db/schema';
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
    const todayTransactions = todaySummary?.transactions || 0;
    const todayProfit = todayRevenue - todayCogs;

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
    const yesterdayTransactions = yesterdaySummary?.transactions || 0;
    const yesterdayProfit = yesterdayRevenue - yesterdayCogs;

    // Calculate Percentage Changes vs yesterday
    const calculatePercentChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const revenueChange = calculatePercentChange(todayRevenue, yesterdayRevenue);
    const profitChange = calculatePercentChange(todayProfit, yesterdayProfit);
    const transactionsChange = calculatePercentChange(todayTransactions, yesterdayTransactions);

    // 4. Low stock variants count
    const [lowStockSummary] = await db.select({
      count: sql<number>`COUNT(${productVariants.id})::int`
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.businessId, businessId),
        sql`${productVariants.baseStockQuantity} <= ${productVariants.lowStockThreshold}`,
        eq(productVariants.isActive, true)
      )
    );

    const lowStockCount = lowStockSummary?.count || 0;

    // 5. Weekly Sales Chart Data (Last 7 Days)
    const rawWeekly = await db.select({
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

    // Map last 7 days including empty days
    const weeklySales = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const match = rawWeekly.find(r => r.date === dateStr);
      
      const rev = Number(match?.revenue || 0);
      const cogs = Number(match?.cogs || 0);
      weeklySales.push({
        date: dateStr,
        revenue: rev,
        profit: rev - cogs
      });
    }

    // 6. Today's Payment Method Split
    const rawPayments = await db.select({
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

    const paymentSplit = rawPayments.map(p => ({
      name: p.method,
      value: Number(p.total)
    }));

    // 7. Low Stock Alerts List (Top 5 lowest stock variants)
    const lowStockList = await db.select({
      variantId: productVariants.id,
      productName: products.name,
      variantName: productVariants.name,
      baseStockQuantity: productVariants.baseStockQuantity,
      lowStockThreshold: productVariants.lowStockThreshold,
      baseUnitName: productVariants.baseUnitName
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(productVariants.businessId, businessId),
        sql`${productVariants.baseStockQuantity} <= ${productVariants.lowStockThreshold}`,
        eq(productVariants.isActive, true)
      )
    )
    .orderBy(productVariants.baseStockQuantity)
    .limit(5);

    // 8. Recent Sales (Top 5 latest sales)
    const recentSales = await db.select({
      id: sales.id,
      receiptNumber: sales.receiptNumber,
      totalAmount: sales.totalAmount,
      amountPaid: sales.amountPaid,
      paymentMethod: sales.paymentMethod,
      paymentStatus: sales.paymentStatus,
      soldAt: sales.soldAt,
      customerName: customers.name
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.businessId, businessId))
    .orderBy(desc(sales.soldAt))
    .limit(5);

    // 9. Recent Stock Movements (Top 5 latest movements)
    const recentMovements = await db.select({
      id: stockMovements.id,
      variantName: productVariants.name,
      productName: products.name,
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

    // 10. Today's Credit Issued & Today's Debt Collected
    const [todayCreditIssuedSummary] = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.totalAmount} - ${sales.amountPaid}), 0)`
    })
    .from(sales)
    .where(
      and(
        eq(sales.businessId, businessId),
        gte(sales.soldAt, todayStart),
        sql`${sales.totalAmount} > ${sales.amountPaid}`
      )
    );

    const [todayDebtCollectedSummary] = await db.select({
      total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`
    })
    .from(payments)
    .where(
      and(
        eq(payments.businessId, businessId),
        eq(payments.referenceType, 'CUSTOMER_DEBT'),
        eq(payments.status, 'COMPLETED'),
        gte(payments.paidAt, todayStart)
      )
    );

    // 11. Customer Credit & Supplier liabilities balances
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
        todayCreditIssued: Number(todayCreditIssuedSummary?.total || 0),
        todayDebtCollected: Number(todayDebtCollectedSummary?.total || 0),
        customerOutstanding: Number(customerDebtSummary?.total || 0),
        supplierLiabilities: Number(supplierDebtSummary?.total || 0)
      },
      recentMovements
    };
  }
}
