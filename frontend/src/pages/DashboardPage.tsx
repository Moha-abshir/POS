import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Percent, AlertTriangle, ArrowUpRight, CreditCard, 
  Activity, ArrowRight, Info
} from 'lucide-react';
import { api } from '../lib/api';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = {
  accent: '#D97706', // amber-600
  success: '#16A34A', // green-600
  danger: '#DC2626', // red-600
  info: '#2563EB', // blue-600
  gray: '#9CA3AF', // gray-400
  chartPalette: ['#D97706', '#2563EB', '#16A34A', '#7C3AED', '#EC4899']
};

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<'sales' | 'movements'>('sales');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setData(res.data.data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatKES = (amount: number) => {
    return amount.toLocaleString('en-KE', { style: 'currency', currency: 'KES' });
  };

  const renderTrendIndicator = (changePercent: number) => {
    const isPositive = changePercent >= 0;
    const formatted = Math.abs(changePercent).toFixed(1);

    if (changePercent === 0) {
      return (
        <span className="text-xs text-gray-400 font-medium">0% vs yesterday</span>
      );
    }

    return (
      <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {formatted}% vs yesterday
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />
        <p className="font-semibold">Failed to load dashboard data</p>
        <p className="text-xs text-gray-400">Please verify connection or try again later</p>
      </div>
    );
  }

  const { kpis, charts, lowStockList, recentSales, debtSummary, recentMovements } = data;

  return (
    <div className="p-6 space-y-6">
      
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Summary</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time performance metrics and register status</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/pos" 
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            Open POS Register <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link 
            to="/cash-reconciliation" 
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            Register Audits <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sales Revenue */}
        <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 relative group">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Sales</span>
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                Total net sales revenue generated today, compared with the same hours yesterday.
                <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
              </div>
            </div>
            <div className="p-1.5 bg-amber-50 rounded"><DollarSign className="w-4 h-4 text-[var(--color-accent)]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatKES(kpis.todayRevenue)}</h3>
          <div className="mt-1 flex items-center">
            {renderTrendIndicator(kpis.revenueChangePercent)}
          </div>
        </div>

        {/* KPI 2: Gross Profit */}
        <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 relative group">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Profit</span>
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                Total earnings left today after deducting the cost price of goods sold (COGS) from revenue.
                <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
              </div>
            </div>
            <div className="p-1.5 bg-green-50 rounded"><TrendingUp className="w-4 h-4 text-green-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatKES(kpis.todayGrossProfit)}</h3>
          <div className="mt-1 flex items-center">
            {renderTrendIndicator(kpis.profitChangePercent)}
          </div>
        </div>

        {/* KPI 3: Transactions */}
        <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 relative group">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transactions</span>
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                Total count of invoices and checkouts processed today compared with yesterday.
                <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
              </div>
            </div>
            <div className="p-1.5 bg-blue-50 rounded"><ShoppingBag className="w-4 h-4 text-blue-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{kpis.todaySalesCount}</h3>
          <div className="mt-1 flex items-center">
            {renderTrendIndicator(kpis.salesCountChangePercent)}
          </div>
        </div>

        {/* KPI 4: Low Stock Count */}
        <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 relative group">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Low Stock Items</span>
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                Active catalog variants whose current stock quantity is less than or equal to their low stock threshold.
                <div className="absolute right-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
              </div>
            </div>
            <div className="p-1.5 bg-red-50 rounded"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{kpis.lowStockCount}</h3>
          <p className="text-xs text-gray-400 mt-1">Requires restock catalog attention</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend BarChart */}
        <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">7-Day Sales &amp; Profit Trend</h3>
          <div className="h-80">
            {charts.weeklySales.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No transaction trend data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <Tooltip formatter={(value) => formatKES(Number(value))} />
                  <Legend />
                  <Bar name="Sales Revenue" dataKey="revenue" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                  <Bar name="Gross Profit" dataKey="profit" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Today's Payment Splits */}
        <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Today's Payment Splits</h3>
            <div className="h-56 flex justify-center">
              {charts.paymentSplit.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No payments split logged today</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.paymentSplit.filter((p: any) => p.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="method"
                    >
                      {charts.paymentSplit.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS.chartPalette[index % COLORS.chartPalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatKES(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick Balance Liability widgets */}
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 text-center mt-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Customer Debt</p>
              <p className="text-sm font-bold text-red-600 mt-0.5">{formatKES(debtSummary.customerOutstanding)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Supplier Liabilities</p>
              <p className="text-sm font-bold text-amber-700 mt-0.5">{formatKES(debtSummary.supplierLiabilities)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lists & Feeds Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Activity Feeds */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex border-b border-gray-100 px-5 py-3.5 items-center justify-between">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveFeedTab('sales')}
                className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${
                  activeFeedTab === 'sales'
                    ? 'border-[var(--color-accent)] text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Recent Sales
              </button>
              <button 
                onClick={() => setActiveFeedTab('movements')}
                className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${
                  activeFeedTab === 'movements'
                    ? 'border-[var(--color-accent)] text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Stock Movements
              </button>
            </div>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>

          <div className="p-5 flex-1 min-h-[300px]">
            {activeFeedTab === 'sales' && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-400 uppercase tracking-wider border-b border-gray-100 font-semibold">
                      <th className="pb-2.5">Sold At</th>
                      <th className="pb-2.5">Customer</th>
                      <th className="pb-2.5">Amount</th>
                      <th className="pb-2.5">Method</th>
                      <th className="pb-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-800">
                    {recentSales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">No sales transactions processed yet</td>
                      </tr>
                    ) : (
                      recentSales.map((sale: any) => (
                        <tr key={sale.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5">
                            {new Date(sale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5">{sale.customerName}</td>
                          <td className="py-2.5 font-bold">{formatKES(Number(sale.totalAmount))}</td>
                          <td className="py-2.5 uppercase text-[10px] tracking-wide text-gray-500">{sale.paymentMethod}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              sale.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700 border border-green-100' :
                              sale.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {sale.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeFeedTab === 'movements' && (
              <div className="space-y-4">
                {recentMovements.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">No stock adjustment entries found</div>
                ) : (
                  recentMovements.map((move: any) => {
                    const isIncrease = Number(move.quantityChange) > 0;
                    return (
                      <div key={move.id} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2.5">
                        <div>
                          <p className="font-bold text-gray-900">{move.productName} ({move.variantName})</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Type: <span className="font-bold text-gray-500">{move.type}</span> • {new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          isIncrease ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {isIncrease ? '+' : ''}{Number(move.quantityChange).toFixed(1)} units
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Low Stock Alerts */}
        <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Low Stock Alerts
              </h3>
              <Link to="/inventory" className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-bold">
                View All
              </Link>
            </div>

            <div className="space-y-3.5">
              {lowStockList.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">All inventory variants sufficiently stocked</div>
              ) : (
                lowStockList.map((item: any) => (
                  <div key={item.id} className="border border-gray-100 rounded-lg p-3 space-y-1 hover:bg-gray-50/50 transition-colors">
                    <div className="flex justify-between text-xs font-bold text-gray-900">
                      <span>{item.productName}</span>
                      <span className="text-red-600 font-bold">{Number(item.stock).toFixed(0)} left</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Variant: {item.variantName} {item.sku ? `• SKU: ${item.sku}` : ''}</span>
                      <span>Threshold: {Number(item.threshold).toFixed(0)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-amber-50/40 border border-amber-100 rounded-lg p-3 mt-4 text-[11px] text-amber-800 leading-relaxed">
            Ensure low stock items are replenishment-ordered via the <b>Purchasing</b> module to avoid store stockouts.
          </div>
        </div>

      </div>

    </div>
  );
};
