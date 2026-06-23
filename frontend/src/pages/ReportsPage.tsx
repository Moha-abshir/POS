import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, TrendingUp, TrendingDown, Receipt, DollarSign, Users, AlertTriangle, 
  Truck, Printer, Download, Calendar, RefreshCcw, 
  Trash2, CreditCard, ShoppingBag, PiggyBank, BarChart3, Info
} from 'lucide-react';
import { api } from '../lib/api';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { toast } from 'react-hot-toast';

// Theme Colors
const COLORS = {
  accent: '#D97706', // amber-600
  accentDark: '#B45309', // amber-700
  success: '#16A34A', // green-600
  danger: '#DC2626', // red-600
  info: '#2563EB', // blue-600
  gray: '#9CA3AF', // gray-400
  chartPalette: ['#D97706', '#2563EB', '#16A34A', '#7C3AED', '#EC4899', '#14B8A6', '#F59E0B']
};

export const ReportsPage: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Filter States
  const [preset, setPreset] = useState<string>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'category' | 'product' | 'customer' | 'hour'>('day');

  // API Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [salesReportData, setSalesReportData] = useState<any[]>([]);
  const [profitLossData, setProfitLossData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [creditData, setCreditData] = useState<any>(null);
  const [supplierData, setSupplierData] = useState<any>(null);
  const [mpesaData, setMpesaData] = useState<any>(null);
  const [refundsData, setRefundsData] = useState<any>(null);
  const [damagedData, setDamagedData] = useState<any>(null);

  // Customer Statement Print Modal
  const [statementCustomer, setStatementCustomer] = useState<any>(null);

  // Preset Date Helper
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    
    if (preset === 'today') {
      start.setHours(0,0,0,0);
    } else if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      start.setHours(0,0,0,0);
      today.setDate(today.getDate() - 1);
      today.setHours(23,59,59,999);
    } else if (preset === '7days') {
      start.setDate(today.getDate() - 7);
    } else if (preset === '30days') {
      start.setDate(today.getDate() - 30);
    } else if (preset === '90days') {
      start.setDate(today.getDate() - 90);
    } else if (preset === 'thismonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'lastmonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      today.setDate(0); // last day of previous month
    }

    if (preset !== 'custom') {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  }, [preset]);

  // Fetch Report Data function
  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const params = { startDate, endDate };

      if (activeTab === 'overview') {
        const res = await api.get('/reports/overview', { params });
        setOverviewData(res.data.data);
      } else if (activeTab === 'sales') {
        const res = await api.get('/reports/sales', { params: { ...params, groupBy } });
        setSalesReportData(res.data.data);
      } else if (activeTab === 'profit-loss') {
        const res = await api.get('/reports/profit-loss', { params });
        setProfitLossData(res.data.data);
      } else if (activeTab === 'inventory') {
        const res = await api.get('/reports/inventory');
        setInventoryData(res.data.data);
      } else if (activeTab === 'customers') {
        const res = await api.get('/reports/customers', { params });
        setCustomerData(res.data.data);
      } else if (activeTab === 'credit') {
        const res = await api.get('/reports/credit');
        setCreditData(res.data.data);
      } else if (activeTab === 'suppliers') {
        const res = await api.get('/reports/suppliers', { params });
        setSupplierData(res.data.data);
      } else if (activeTab === 'mpesa') {
        const res = await api.get('/reports/mpesa', { params });
        setMpesaData(res.data.data);
      } else if (activeTab === 'refunds') {
        const res = await api.get('/reports/refunds', { params });
        setRefundsData(res.data.data);
      } else if (activeTab === 'damaged') {
        const res = await api.get('/reports/damaged-goods', { params });
        setDamagedData(res.data.data);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, groupBy]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Export File trigger
  const handleExport = (report: string, format: 'csv' | 'excel' | 'pdf') => {
    const url = `${api.defaults.baseURL}/reports/export?reportType=${report}&format=${format}&startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`;
    window.open(url, '_blank');
    toast.success(`Exporting ${report} as ${format.toUpperCase()}...`);
  };

  const downloadPLGuide = () => {
    const guideContent = `SMART POS PLATFORM - PROFIT & LOSS STATEMENT GUIDE
===================================================

This guide explains how to read and interpret the Profit & Loss (P&L) Statement on the Smart POS Platform.

1. OPERATING REVENUE
--------------------
* Gross Sales Revenue: The total money received from all sales transactions before any deductions.
* Returns & Refunds Processed: Money returned to customers for returned goods. This is subtracted from your revenue.
* Net Operating Revenue: The actual sales income you keep after refunds are subtracted.
  [Net Operating Revenue = Gross Sales Revenue - Refunds]

2. COST OF GOODS SOLD (COGS)
----------------------------
* Total Cost of Sold Inventory: The wholesale cost (what you paid the supplier) for the items you sold.
* Gross Operating Profit: The money you made purely from your markup.
  [Gross Operating Profit = Net Operating Revenue - Cost of Sold Inventory]

3. INVENTORY LOSSES
-------------------
* Damaged Goods Waste Costs: The value of stock that expired, broke, went missing, or was wasted. Since you paid for these items but cannot sell them, this directly reduces your net profit.

4. OPERATING EXPENSES
---------------------
* Operational Costs: Running expenses logged for the business (e.g., Rent, Electricity, Salaries, Transport).
* Total Operating Expenses: The sum of all your business running costs.

5. NET OPERATING PROFIT / INCOME (THE BOTTOM LINE)
--------------------------------------------------
* Net Operating Profit: The final profit of the business after all costs, expenses, and inventory losses are subtracted.
  [Net Operating Profit = Gross Operating Profit - Inventory Losses - Total Expenses]
* If this is positive (greater than 0), your business is running profitably.
* If this is negative (less than 0), the business is operating at a loss.
Need support? Contact Smart POS Customer Support at +254714731331.
`;

    const blob = new Blob([guideContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Smart_POS_PL_Explanation_Guide.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('P&L Explanation Guide downloaded successfully!');
  };

  // Helper format currency
  const formatKES = (num: number) => {
    return 'KES ' + (num || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Sidebar Menu Items
  const menuItems = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'sales', name: 'Sales Reports', icon: Receipt },
    { id: 'profit-loss', name: 'Profit & Loss', icon: TrendingUp },
    { id: 'inventory', name: 'Inventory Valuation', icon: ShoppingBag },
    { id: 'customers', name: 'Customer Rankings', icon: Users },
    { id: 'credit', name: 'Credit Aging', icon: CreditCard },
    { id: 'suppliers', name: 'Supplier Purchases', icon: Truck },
    { id: 'mpesa', name: 'M-Pesa Performance', icon: PiggyBank },
    { id: 'refunds', name: 'Refunds & Returns', icon: RefreshCcw },
    { id: 'damaged', name: 'Damaged Goods', icon: Trash2 },
    { id: 'export', name: 'Export Center', icon: Download },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--color-bg-base)]">
      
      {/* 1. Reports Navigation Sidebar */}
      <div className="w-64 bg-white border-r border-[var(--color-border)] shrink-0 flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Reports Module</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'export') setPreset('30days');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]' 
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-100 hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent)]' : 'text-gray-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 2. Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Filters Toolbar */}
        {activeTab !== 'export' && (
          <div className="bg-white border-b border-[var(--color-border)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase mr-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Range:
              </span>
              {[
                { id: 'today', name: 'Today' },
                { id: 'yesterday', name: 'Yesterday' },
                { id: '7days', name: '7 Days' },
                { id: '30days', name: '30 Days' },
                { id: 'thismonth', name: 'This Month' },
                { id: 'custom', name: 'Custom Range' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    preset === p.id 
                      ? 'bg-[var(--color-accent)] text-white' 
                      : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-[var(--color-border-strong)] rounded-md px-2 py-1 text-xs outline-none bg-white focus:border-[var(--color-accent)]"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-[var(--color-border-strong)] rounded-md px-2 py-1 text-xs outline-none bg-white focus:border-[var(--color-accent)]"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button 
                onClick={fetchReportData}
                className="p-1.5 border border-[var(--color-border-strong)] rounded hover:bg-gray-50 transition-colors"
                title="Refresh Report Data"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </button>
              <div className="h-6 w-px bg-gray-200"></div>
              <button
                onClick={() => handleExport(activeTab, 'csv')}
                className="flex items-center gap-1 text-xs font-medium border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-50 text-[var(--color-text-secondary)] transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={() => handleExport(activeTab, 'excel')}
                className="flex items-center gap-1 text-xs font-medium border border-green-300 rounded px-2.5 py-1.5 hover:bg-green-50 text-green-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => handleExport(activeTab, 'pdf')}
                className="flex items-center gap-1 text-xs font-medium border border-amber-300 rounded px-2.5 py-1.5 hover:bg-amber-50 text-[var(--color-accent-hover)] transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> PDF / Print
              </button>
            </div>
          </div>
        )}

        {/* 3. Tab Contents Layout */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-10 h-10 border-4 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-[var(--color-text-secondary)] font-medium">Aggregating database reports metrics...</p>
            </div>
          ) : (
            <>
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && overviewData && (
                <div className="space-y-6">
                  {/* Overview Kpi Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Sales Revenue</span>
                          <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            Total income generated from all sales transactions in the selected period (excluding refunds and before any deductions).
                            <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                        <div className="p-1.5 bg-amber-50 rounded"><DollarSign className="w-4 h-4 text-[var(--color-accent)]" /></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatKES(overviewData.revenue)}</h3>
                      <p className="text-xs text-gray-400 mt-1">Total revenue in period</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Profit</span>
                          <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            Total revenue minus the Cost of Goods Sold (COGS). Shows earnings left after paying for the product stock, before operational expenses.
                            <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                        <div className="p-1.5 bg-green-50 rounded"><TrendingUp className="w-4 h-4 text-green-600" /></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatKES(overviewData.grossProfit)}</h3>
                      <p className="text-xs text-green-600 font-semibold mt-1">Margin: {overviewData.grossMargin.toFixed(1)}%</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expenses</span>
                          <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            Sum of all operational costs (such as rent, utilities, salaries, and marketing) recorded during the selected period.
                            <div className="absolute right-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                        <div className="p-1.5 bg-red-50 rounded"><TrendingDown className="w-4 h-4 text-red-600" /></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatKES(overviewData.expenses)}</h3>
                      <p className="text-xs text-gray-400 mt-1">Operational cost</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm bg-gradient-to-br from-amber-50/20 to-white">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Net Operating Profit</span>
                          <Info className="w-3.5 h-3.5 text-amber-500 hover:text-amber-700 cursor-help" />
                          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            Final business earnings after deducting both operational expenses and inventory losses (damaged/waste) from Gross Profit.<br/><b className="text-amber-400 font-semibold">Formula:</b> Gross Profit - Expenses - Damaged Loss
                            <div className="absolute right-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                        <div className="p-1.5 bg-amber-100 rounded"><PiggyBank className="w-4 h-4 text-[var(--color-accent)]" /></div>
                      </div>
                      <h3 className="text-2xl font-bold text-amber-900 mt-2">{formatKES(overviewData.netProfit)}</h3>
                      <p className="text-xs text-amber-600 font-semibold mt-1">After expenses & waste</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Trend AreaChart */}
                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm lg:col-span-2">
                      <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Revenue Trend over time</h3>
                      <div className="h-80">
                        {overviewData.trend.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data for this period</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={overviewData.trend}>
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" tick={{fontSize: 11}} />
                              <YAxis tick={{fontSize: 11}} />
                              <Tooltip formatter={(value) => formatKES(Number(value))} />
                              <Area type="monotone" dataKey="revenue" stroke={COLORS.accent} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Payment split & Stats */}
                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Payment Methods split</h3>
                        <div className="h-56 flex justify-center">
                          {overviewData.paymentsBreakdown.CASH === 0 && overviewData.paymentsBreakdown.MPESA === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">No payments recorded</div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'CASH', value: overviewData.paymentsBreakdown.CASH },
                                    { name: 'M-PESA', value: overviewData.paymentsBreakdown.MPESA }
                                  ].filter(p => p.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  <Cell fill={COLORS.accent} />
                                  <Cell fill={COLORS.info} />
                                </Pie>
                                <Tooltip formatter={(value) => formatKES(Number(value))} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-[var(--color-border)] pt-4 grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-400">Transactions</p>
                          <p className="text-lg font-bold text-gray-900">{overviewData.salesCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Avg Basket Value</p>
                          <p className="text-lg font-bold text-gray-900">{formatKES(overviewData.averageBasket)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Waste and Credit summary blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-red-50 rounded-full text-red-600"><Trash2 className="w-5 h-5" /></div>
                      <div className="relative group flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-gray-400 font-medium">Damaged Goods Loss</p>
                          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{formatKES(overviewData.damagedCost)}</p>
                        <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Total valuation (cost price) of products recorded as damaged, expired, or lost during the period.
                          <div className="absolute left-4 bottom-0 w-2 h-2 bg-gray-900 rotate-45 translate-y-1/2"></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-amber-50 rounded-full text-[var(--color-accent)]"><CreditCard className="w-5 h-5" /></div>
                      <div className="relative group flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-gray-400 font-medium">New Outstanding Credit</p>
                          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{formatKES(overviewData.totalUnpaidCredit)}</p>
                        <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Total value of sales made on credit during this period that have not yet been paid by customers.
                          <div className="absolute left-4 bottom-0 w-2 h-2 bg-gray-900 rotate-45 translate-y-1/2"></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Truck className="w-5 h-5" /></div>
                      <div className="relative group flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-gray-400 font-medium">Supplier Purchases Cost</p>
                          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{formatKES(overviewData.purchases)}</p>
                        <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Total valuation of supply inventory purchased from suppliers in this period (cash paid or unpaid liabilities).
                          <div className="absolute right-4 bottom-0 w-2 h-2 bg-gray-900 rotate-45 translate-y-1/2"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: SALES REPORTS */}
              {activeTab === 'sales' && (
                <div className="space-y-6">
                  {/* Group selection toolbar */}
                  <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase">Group Sales By:</span>
                      {[
                        { id: 'day', name: 'Daily' },
                        { id: 'week', name: 'Weekly' },
                        { id: 'month', name: 'Monthly' },
                        { id: 'category', name: 'Category' },
                        { id: 'product', name: 'Top Products' },
                        { id: 'customer', name: 'Top Customers' },
                        { id: 'hour', name: 'Hourly Distribution' },
                      ].map(g => (
                        <button
                          key={g.id}
                          onClick={() => setGroupBy(g.id as any)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                            groupBy === g.id 
                              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20' 
                              : 'bg-gray-50 text-[var(--color-text-secondary)] hover:bg-gray-100'
                          }`}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart representation */}
                  <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                    <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Visual Aggregate Analysis</h3>
                    <div className="h-80">
                      {salesReportData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data found for current filters</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesReportData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="groupKey" tick={{fontSize: 11}} />
                            <YAxis tick={{fontSize: 11}} />
                            <Tooltip formatter={(value) => typeof value === 'number' && value < 1000 && groupBy === 'category' ? value : formatKES(Number(value))} />
                            <Bar dataKey={groupBy === 'category' || groupBy === 'product' ? 'totalSales' : 'totalSales'} fill={COLORS.accent} radius={[4, 4, 0, 0]}>
                              {salesReportData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.chartPalette[index % COLORS.chartPalette.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)]">
                      <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Tabular sales breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-[var(--color-border)] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Grouping Field</th>
                            <th className="p-4 text-right">Total Revenue (KES)</th>
                            {(groupBy === 'category' || groupBy === 'product') ? (
                              <th className="p-4 text-right">Quantity Sold</th>
                            ) : (
                              <th className="p-4 text-right">Transactions Count</th>
                            )}
                            {!(groupBy === 'category' || groupBy === 'product' || groupBy === 'customer' || groupBy === 'hour') && (
                              <th className="p-4 text-right">Average Transaction Basket</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                          {salesReportData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-medium text-gray-900">{row.groupKey}</td>
                              <td className="p-4 text-right">{formatKES(Number(row.totalSales || row.totalSales))}</td>
                              <td className="p-4 text-right">
                                {groupBy === 'category' || groupBy === 'product' ? Number(row.quantitySold).toLocaleString() : row.transactionCount}
                              </td>
                              {!(groupBy === 'category' || groupBy === 'product' || groupBy === 'customer' || groupBy === 'hour') && (
                                <td className="p-4 text-right">{formatKES(Number(row.averageSale))}</td>
                              )}
                            </tr>
                          ))}
                          {salesReportData.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-gray-400">No records available for the selected filters</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PROFIT & LOSS STATEMENT */}
              {activeTab === 'profit-loss' && profitLossData && (
                <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg border border-[var(--color-border)] shadow-md">
                  <div className="text-center border-b border-[var(--color-border)] pb-6 mb-6 relative">
                    <h2 className="text-2xl font-bold text-gray-900">Profit &amp; Loss Statement</h2>
                    <p className="text-sm text-gray-500 mt-1">Smart POS Platform</p>
                    <p className="text-xs text-[var(--color-accent)] font-semibold mt-1">
                      Period: {startDate} to {endDate}
                    </p>
                    <button
                      onClick={downloadPLGuide}
                      className="absolute right-0 bottom-2 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] bg-[var(--color-accent-subtle)] px-2.5 py-1.5 rounded transition-colors"
                      title="Download Profit & Loss Terminology Guide"
                    >
                      <Download className="w-3.5 h-3.5" /> P&amp;L Guide
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Operating Revenue */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Operating Revenue</h3>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className="text-gray-600 pl-4">Gross Sales Revenue</span>
                        <span className="font-medium">{formatKES(profitLossData.grossRevenue)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm text-red-600 border-b border-dashed border-gray-100">
                        <span className="pl-4">Minus Returns &amp; Refunds processed</span>
                        <span>({formatKES(profitLossData.refunds)})</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm font-bold bg-gray-50 px-2 rounded mt-1">
                        <span>Net Operating Revenue</span>
                        <span className="underline decoration-double">{formatKES(profitLossData.netRevenue)}</span>
                      </div>
                    </div>

                    {/* Cost of Goods Sold */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Cost of Goods Sold (COGS)</h3>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className="text-gray-600 pl-4">Total Cost of Sold Inventory</span>
                        <span className="text-red-600">({formatKES(profitLossData.cogs)})</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm font-bold bg-gray-50 px-2 rounded mt-1">
                        <span>Gross Operating Profit Margin</span>
                        <span>{formatKES(profitLossData.grossProfit)}</span>
                      </div>
                    </div>

                    {/* Operational Losses & Waste */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Inventory Losses</h3>
                      <div className="flex justify-between py-1.5 text-sm text-red-600">
                        <span className="pl-4">Damaged Goods Waste Costs</span>
                        <span>({formatKES(profitLossData.damagedLoss)})</span>
                      </div>
                    </div>

                    {/* Operating Expenses */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-2">Operating Expenses</h3>
                      {profitLossData.expenses.map((exp: any, index: number) => (
                        <div key={index} className="flex justify-between py-1.5 text-sm">
                          <span className="text-gray-600 pl-4 capitalize">{exp.category}</span>
                          <span className="text-red-500">({formatKES(exp.amount)})</span>
                        </div>
                      ))}
                      {profitLossData.expenses.length === 0 && (
                        <div className="text-xs text-gray-400 pl-4 py-2">No operating expenses recorded for period</div>
                      )}
                      <div className="flex justify-between py-1.5 text-sm font-bold border-t border-gray-200 mt-2">
                        <span className="pl-4">Total Operating Expenses</span>
                        <span className="text-red-600">({formatKES(profitLossData.totalExpenses)})</span>
                      </div>
                    </div>

                    {/* Net income */}
                    <div className="pt-4 border-t-2 border-gray-900">
                      <div className={`flex justify-between py-3 px-3 rounded-lg text-base font-bold ${
                        profitLossData.netProfit >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        <span>NET OPERATING PROFIT / INCOME</span>
                        <span className="text-xl underline decoration-double">{formatKES(profitLossData.netProfit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: INVENTORY VALUATION */}
              {activeTab === 'inventory' && inventoryData && (
                <div className="space-y-6">
                  {/* Valuation Summary Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Inventory Value (Cost Price)</span>
                          <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            The total cash value of your current stock based on the cost price you paid the supplier.
                            <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatKES(inventoryData.assetValueCost)}</h3>
                      <p className="text-xs text-gray-400 mt-1">Asset cost valuation</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Potential Sales Revenue (Selling Price)</span>
                          <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            The total revenue you will generate if all your current stock is sold at your retail price.
                            <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatKES(inventoryData.assetValueRetail)}</h3>
                      <p className="text-xs text-gray-400 mt-1">If all items sold at current unit price</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm bg-gradient-to-br from-green-50/20 to-white">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Potential Profit Margin</span>
                          <Info className="w-3.5 h-3.5 text-green-500 hover:text-green-700 cursor-help" />
                          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            The estimated gross profit you stand to make once all current inventory is sold.<br/><b className="text-green-400 font-semibold">Formula:</b> Revenue (Selling) - Value (Cost)
                            <div className="absolute right-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-green-800 mt-2">{formatKES(inventoryData.potentialProfit)}</h3>
                      <p className="text-xs text-green-600 font-semibold mt-1">Estimated gross profit margin</p>
                    </div>
                  </div>

                  {/* Stock Levels Summary Block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3 relative group flex-1">
                        <div className="p-3 bg-amber-50 rounded text-[var(--color-accent)]"><AlertTriangle className="w-5 h-5" /></div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="text-sm font-bold text-gray-950">Low Stock Items Alert</h4>
                            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          </div>
                          <p className="text-xs text-gray-400">At or below warning thresholds</p>
                        </div>
                        <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Number of unique products whose current stock level is at or below the warning threshold (reorder point).
                          <div className="absolute left-4 bottom-0 w-2 h-2 bg-gray-900 rotate-45 translate-y-1/2"></div>
                        </div>
                      </div>
                      <span className="text-2xl font-black text-amber-700">{inventoryData.lowStockCount}</span>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3 relative group flex-1">
                        <div className="p-3 bg-red-50 rounded text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="text-sm font-bold text-gray-950">Out of Stock Items</h4>
                            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          </div>
                          <p className="text-xs text-gray-400">Completely depleted items</p>
                        </div>
                        <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Number of unique products that have completely run out of stock (current stock is 0).
                          <div className="absolute right-4 bottom-0 w-2 h-2 bg-gray-900 rotate-45 translate-y-1/2"></div>
                        </div>
                      </div>
                      <span className="text-2xl font-black text-red-600">{inventoryData.outOfStockCount}</span>
                    </div>
                  </div>

                  {/* Fast Moving & Slow Moving Tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Fast Moving */}
                    <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-[var(--color-border)] bg-gray-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" /> Top Fast Moving Items (90 Days)
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--color-border)] bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              <th className="p-3">Product Name</th>
                              <th className="p-3">SKU</th>
                              <th className="p-3 text-right">Qty Sold</th>
                              <th className="p-3 text-right">Revenue (KES)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)] text-xs text-[var(--color-text-primary)]">
                            {inventoryData.fastMoving.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-semibold text-gray-950">{item.productName} ({item.variantName})</td>
                                <td className="p-3 text-gray-500">{item.sku || 'N/A'}</td>
                                <td className="p-3 text-right font-medium">{Number(item.quantitySold).toLocaleString()}</td>
                                <td className="p-3 text-right">{formatKES(Number(item.revenue))}</td>
                              </tr>
                            ))}
                            {inventoryData.fastMoving.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-400">No fast-moving records</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Slow Moving */}
                    <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-[var(--color-border)] bg-gray-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-600" /> Dead / Slow Moving Items (90 Days)
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--color-border)] bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              <th className="p-3">Product Name</th>
                              <th className="p-3">SKU</th>
                              <th className="p-3 text-right">Current Stock</th>
                              <th className="p-3 text-right">Qty Sold</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)] text-xs text-[var(--color-text-primary)]">
                            {inventoryData.slowMoving.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-semibold text-gray-950">{item.productName} ({item.variantName})</td>
                                <td className="p-3 text-gray-500">{item.sku || 'N/A'}</td>
                                <td className="p-3 text-right font-medium">{Number(item.currentStock).toLocaleString()}</td>
                                <td className="p-3 text-right text-amber-700">{Number(item.quantitySold).toLocaleString()}</td>
                              </tr>
                            ))}
                            {inventoryData.slowMoving.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-400">No slow-moving records</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CUSTOMER RANKINGS */}
              {activeTab === 'customers' && customerData && (
                <div className="space-y-6">
                  {/* Top outstanding customer debt aggregate */}
                  <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1.5 relative group">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Outstanding Customer Credit Debt</span>
                          <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                            The total unpaid balance currently owed to your business by all customers who bought items on credit.
                            <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                          </div>
                        </div>
                        <h3 className="text-3xl font-black text-red-600 mt-2">{formatKES(customerData.totalOutstandingCredit)}</h3>
                      </div>
                      <div className="p-3 bg-red-50 rounded text-red-600"><AlertTriangle className="w-6 h-6" /></div>
                    </div>
                  </div>

                  {/* Customer Rankings Table */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-gray-50">
                      <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Customer Rankings by Sales Volume</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Phone Number</th>
                            <th className="p-4 text-right">Total Spent (KES)</th>
                            <th className="p-4 text-right">Visits (Sales Count)</th>
                            <th className="p-4 text-right">Current Outstanding Debt</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                          {customerData.rankings.map((cust: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-semibold text-gray-950">{cust.name}</td>
                              <td className="p-4 text-gray-500">{cust.phone || 'N/A'}</td>
                              <td className="p-4 text-right font-medium">{formatKES(Number(cust.totalSpent))}</td>
                              <td className="p-4 text-right">{cust.visitCount}</td>
                              <td className="p-4 text-right text-red-600 font-medium">
                                {Number(cust.unpaidDebt) > 0 ? formatKES(Number(cust.unpaidDebt)) : '—'}
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => setStatementCustomer(cust)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] hover:underline"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Printable Statement
                                </button>
                              </td>
                            </tr>
                          ))}
                          {customerData.rankings.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">No customer rankings found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CREDIT AGING */}
              {activeTab === 'credit' && creditData && (
                <div className="space-y-6">
                  {/* Aging Bucket Card Deck */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex items-center gap-1.5 relative group">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Outstanding Credit</span>
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          The sum of all unpaid customer balances currently owed to your business.
                          <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-red-600 mt-1">{formatKES(creditData.summary.totalOutstanding)}</h4>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex items-center gap-1.5 relative group">
                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">0 - 30 Days Old</span>
                        <Info className="w-3 h-3 text-green-500 hover:text-green-600 cursor-help" />
                        <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Recent customer credit debt logged within the last 30 days.
                          <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mt-1">{formatKES(creditData.summary.bucket_0_30)}</h4>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex items-center gap-1.5 relative group">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">31 - 60 Days Old</span>
                        <Info className="w-3 h-3 text-amber-500 hover:text-amber-600 cursor-help" />
                        <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Outstanding credit debt that has been unpaid for 31 to 60 days.
                          <div className="absolute left-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mt-1">{formatKES(creditData.summary.bucket_31_60)}</h4>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex items-center gap-1.5 relative group">
                        <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">61 - 90 Days Old</span>
                        <Info className="w-3 h-3 text-orange-500 hover:text-orange-600 cursor-help" />
                        <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Outstanding credit debt that has been unpaid for 61 to 90 days.
                          <div className="absolute right-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mt-1">{formatKES(creditData.summary.bucket_61_90)}</h4>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <div className="flex items-center gap-1.5 relative group">
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">90+ Days (Critical)</span>
                        <Info className="w-3 h-3 text-red-500 hover:text-red-600 cursor-help" />
                        <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
                          Overdue credit debt unpaid for more than 90 days. High risk of loss.
                          <div className="absolute right-4 top-0 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1/2"></div>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-red-600 mt-1">{formatKES(creditData.summary.bucket_90_plus)}</h4>
                    </div>
                  </div>

                  {/* Credit Aging Detail Table */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)] bg-gray-50">
                      <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Credit Aging Analysis per Customer</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4 text-right">Outstanding Credit</th>
                            <th className="p-4 text-right">0-30 Days</th>
                            <th className="p-4 text-right">31-60 Days</th>
                            <th className="p-4 text-right">61-90 Days</th>
                            <th className="p-4 text-right">90+ Days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                          {creditData.customers.map((c: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-semibold text-gray-950">{c.customerName}</td>
                              <td className="p-4 text-gray-500">{c.customerPhone || 'N/A'}</td>
                              <td className="p-4 text-right text-red-600 font-semibold">{formatKES(c.totalUnpaid)}</td>
                              <td className="p-4 text-right">{c.bucket_0_30 > 0 ? formatKES(c.bucket_0_30) : '—'}</td>
                              <td className="p-4 text-right text-amber-700">{c.bucket_31_60 > 0 ? formatKES(c.bucket_31_60) : '—'}</td>
                              <td className="p-4 text-right text-orange-700">{c.bucket_61_90 > 0 ? formatKES(c.bucket_61_90) : '—'}</td>
                              <td className="p-4 text-right text-red-700 font-bold">{c.bucket_90_plus > 0 ? formatKES(c.bucket_90_plus) : '—'}</td>
                            </tr>
                          ))}
                          {creditData.customers.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-gray-400">No outstanding customer debts found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: SUPPLIER PURCHASES */}
              {activeTab === 'suppliers' && supplierData && (
                <div className="space-y-6">
                  {/* Supplier balance card */}
                  <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Outstanding Debt to Suppliers</p>
                        <h3 className="text-3xl font-black text-amber-700 mt-2">{formatKES(supplierData.totalSupplierDebt)}</h3>
                      </div>
                      <div className="p-3 bg-amber-50 rounded text-amber-600"><Truck className="w-6 h-6" /></div>
                    </div>
                  </div>

                  {/* Supplier purchases list */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)] bg-gray-50">
                      <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Supplier Purchases &amp; Payables Ledger</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Supplier Name</th>
                            <th className="p-4">Phone Number</th>
                            <th className="p-4 text-right">Total Purchases (KES)</th>
                            <th className="p-4 text-right">Amount Paid (KES)</th>
                            <th className="p-4 text-right">Unpaid Balance Debt</th>
                            <th className="p-4 text-center">Purchases Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                          {supplierData.suppliers.map((s: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-semibold text-gray-950">{s.name}</td>
                              <td className="p-4 text-gray-500">{s.phone || 'N/A'}</td>
                              <td className="p-4 text-right font-medium">{formatKES(s.totalPurchases)}</td>
                              <td className="p-4 text-right">{formatKES(s.amountPaid)}</td>
                              <td className={`p-4 text-right font-medium ${s.outstandingBalance > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                                {s.outstandingBalance > 0 ? formatKES(s.outstandingBalance) : '—'}
                              </td>
                              <td className="p-4 text-center">{s.purchaseCount}</td>
                            </tr>
                          ))}
                          {supplierData.suppliers.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">No supplier purchases found in this range</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: MPESA PERFORMANCE */}
              {activeTab === 'mpesa' && mpesaData && (
                <div className="space-y-6">
                  {/* KPI card row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Collections</p>
                      <h3 className="text-2xl font-bold text-blue-600 mt-2">{formatKES(mpesaData.collectedAmount)}</h3>
                      <p className="text-xs text-gray-400 mt-1">Settled STK &amp; Paybill</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Success Rate</p>
                      <h3 className="text-2xl font-bold text-green-600 mt-2">{mpesaData.successRate.toFixed(1)}%</h3>
                      <p className="text-xs text-green-600 font-semibold mt-1">
                        {mpesaData.completedCount} of {mpesaData.totalCount} completed
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Failed Requests</p>
                      <h3 className="text-2xl font-bold text-red-600 mt-2">{mpesaData.failedCount}</h3>
                      <p className="text-xs text-red-500 font-semibold mt-1">Canceled / Insufficient funds</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Checkouts</p>
                      <h3 className="text-2xl font-bold text-amber-600 mt-2">{mpesaData.pendingCount}</h3>
                      <p className="text-xs text-gray-400 mt-1">Awaiting customer PIN</p>
                    </div>
                  </div>

                  {/* Collections grouped by Till vs Paybill shortcode details */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)] bg-gray-50">
                      <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Collections breakdown per shortcode / account</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Account Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Shortcode / StoreNo</th>
                            <th className="p-4 text-right">Total Collected (KES)</th>
                            <th className="p-4 text-right">Transactions Count</th>
                            <th className="p-4 text-right">Success Rate (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                          {mpesaData.accounts.map((acc: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-semibold text-gray-950">{acc.accountName}</td>
                              <td className="p-4"><span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                acc.accountType === 'TILL' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                              }`}>{acc.accountType}</span></td>
                              <td className="p-4 text-gray-500">{acc.shortcode}</td>
                              <td className="p-4 text-right font-bold text-blue-900">{formatKES(acc.collectedAmount)}</td>
                              <td className="p-4 text-right">{acc.transactionCount}</td>
                              <td className="p-4 text-right font-medium text-green-600">{acc.successRate.toFixed(1)}%</td>
                            </tr>
                          ))}
                          {mpesaData.accounts.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">No M-Pesa accounts recorded collections</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: REFUNDS & RETURNS */}
              {activeTab === 'refunds' && refundsData && (
                <div className="space-y-6">
                  {/* Refund summary block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Value Refunded</p>
                      <h3 className="text-2xl font-bold text-red-600 mt-2">{formatKES(refundsData.totalRefunded)}</h3>
                      <p className="text-xs text-gray-400 mt-1">Net loss from refunds</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Refund Cases Count</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">{refundsData.refundCount} cases</h3>
                      </div>
                      <div className="p-3 bg-red-50 rounded-full text-red-500"><RefreshCcw className="w-5 h-5" /></div>
                    </div>
                  </div>

                  {/* Refunded items details */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)] bg-gray-50">
                      <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Returned Products detail log</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Product / Item Description</th>
                            <th className="p-4 text-right">Quantity Returned</th>
                            <th className="p-4 text-right">Total Refunded Value (KES)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                          {refundsData.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-semibold text-gray-950">{item.productName} ({item.variantName})</td>
                              <td className="p-4 text-right font-medium">{Number(item.quantityRefunded).toLocaleString()}</td>
                              <td className="p-4 text-right text-red-600 font-semibold">{formatKES(Number(item.totalValue))}</td>
                            </tr>
                          ))}
                          {refundsData.items.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-8 text-center text-gray-400">No refunded items logs found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: DAMAGED GOODS */}
              {activeTab === 'damaged' && damagedData && (
                <div className="space-y-6">
                  {/* KPI row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Value Cost of Damage (COGS loss)</p>
                      <h3 className="text-2xl font-bold text-red-600 mt-2">{formatKES(damagedData.totalCost)}</h3>
                      <p className="text-xs text-gray-400 mt-1">Evaluated at product cost price</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Damaged Quantity</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-2">{Number(damagedData.totalQuantity).toLocaleString()} units</h3>
                      <p className="text-xs text-gray-400 mt-1">Defective / broken inventory items</p>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Damage Reports count</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">{damagedData.eventCount} incidents</h3>
                      </div>
                      <div className="p-3 bg-red-50 rounded-full text-red-500"><Trash2 className="w-5 h-5" /></div>
                    </div>
                  </div>

                  {/* Damaged items list */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)] bg-gray-50">
                      <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Damaged Goods Waste ledger</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Product Name (Variant)</th>
                            <th className="p-4">SKU</th>
                            <th className="p-4 text-right">Quantity Damaged</th>
                            <th className="p-4 text-right">Cost Price (KES)</th>
                            <th className="p-4 text-right">Total Cost Loss (KES)</th>
                            <th className="p-4">Reason / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
                          {damagedData.items.map((i: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-4 font-semibold text-gray-950">{i.productName} ({i.variantName})</td>
                              <td className="p-4 text-gray-500">{i.sku || 'N/A'}</td>
                              <td className="p-4 text-right font-medium">{Number(i.quantity).toLocaleString()}</td>
                              <td className="p-4 text-right">{formatKES(Number(i.costPrice))}</td>
                              <td className="p-4 text-right text-red-600 font-semibold">{formatKES(Number(i.totalCost))}</td>
                              <td className="p-4 text-gray-500 italic max-w-xs truncate">{i.reason || 'No notes'}</td>
                            </tr>
                          ))}
                          {damagedData.items.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400">No damaged goods logged</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: EXPORT CENTER */}
          {activeTab === 'export' && (
            <div className="max-w-xl mx-auto bg-white p-8 rounded-lg border border-[var(--color-border)] shadow-md">
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4 mb-6">
                <div className="p-3 bg-amber-50 rounded-full text-[var(--color-accent)]"><Download className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Export Center Deck</h2>
                  <p className="text-xs text-gray-400">Export aggregated reports in bulk format</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Preset selectors */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase mb-2">1. Date Range Preset</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'today', name: 'Today' },
                      { id: 'yesterday', name: 'Yesterday' },
                      { id: '7days', name: 'Last 7 Days' },
                      { id: '30days', name: 'Last 30 Days' },
                      { id: 'thismonth', name: 'This Month' },
                      { id: 'custom', name: 'Custom Dates' },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPreset(p.id)}
                        className={`py-2 text-xs font-medium border rounded transition-colors ${
                          preset === p.id 
                            ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent)]' 
                            : 'border-gray-200 hover:bg-gray-50 text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-xs outline-none bg-white focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-xs outline-none bg-white focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>
                )}

                <div className="h-px bg-gray-100 my-4"></div>

                {/* Report Grid triggers */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase mb-2">2. Trigger Downloads</label>
                  <div className="space-y-3">
                    {[
                      { id: 'overview', name: 'Business Performance Overview' },
                      { id: 'sales', name: 'Sales Transactions Summary' },
                      { id: 'profit-loss', name: 'Financial Profit & Loss Statement' },
                      { id: 'inventory', name: 'Inventory Asset Valuation' },
                      { id: 'customers', name: 'Customer Volume Rankings' },
                      { id: 'credit', name: 'Outstanding Customer Credit Aging' },
                      { id: 'suppliers', name: 'Supplier Purchase balances' },
                      { id: 'mpesa', name: 'Mpesa Webhook Performance logs' },
                      { id: 'refunds', name: 'Refunds & Returns Metrics' },
                      { id: 'damaged', name: 'Damaged Goods cost losses' },
                    ].map(rep => (
                      <div key={rep.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-semibold text-gray-800">{rep.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExport(rep.id, 'csv')}
                            className="px-2.5 py-1 text-[10px] font-bold border border-gray-300 rounded text-[var(--color-text-secondary)] hover:bg-white"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExport(rep.id, 'excel')}
                            className="px-2.5 py-1 text-[10px] font-bold border border-green-300 rounded text-green-700 hover:bg-green-50"
                          >
                            Excel
                          </button>
                          <button
                            onClick={() => handleExport(rep.id, 'pdf')}
                            className="px-2.5 py-1 text-[10px] font-bold border border-amber-300 rounded text-[var(--color-accent)] hover:bg-amber-50"
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4. Customer Statement printable Drawer / Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-sm font-bold text-gray-900 uppercase">Customer Credit Account Statement</h3>
              <button 
                onClick={() => setStatementCustomer(null)}
                className="text-gray-400 hover:text-gray-500 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            
            {/* Modal print-friendly content */}
            <div className="flex-1 overflow-y-auto p-6" id="printable-statement">
              <div className="border-b-2 border-gray-900 pb-4 mb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Smart Store POS</h2>
                  <p className="text-xs text-gray-400">Nairobi, Kenya</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-gray-700 uppercase">Account Statement</h3>
                  <p className="text-xs text-gray-400">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer Details info block */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Customer Name</p>
                  <p className="text-sm font-bold text-gray-900">{statementCustomer.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</p>
                  <p className="text-sm font-bold text-gray-900">{statementCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Sales Purchases (LTV)</p>
                  <p className="text-sm font-bold text-gray-900">{formatKES(Number(statementCustomer.totalSpent))}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase">Total Unpaid Balance (Debt)</p>
                  <p className="text-sm font-bold text-red-600">{formatKES(Number(statementCustomer.unpaidDebt))}</p>
                </div>
              </div>

              {/* Notice text */}
              <div className="border-l-4 border-l-amber-500 bg-amber-50 p-4 rounded text-xs text-amber-800 leading-relaxed mb-6">
                <h5 className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Credit Terms Information</h5>
                <p className="mt-1">This statement represents all unpaid credit transactions logged against this account. Please settle outstanding balances promptly to keep your account credit line active.</p>
              </div>

              <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-6">
                <p>Generated via Smart POS Platform reports center</p>
              </div>
            </div>

            {/* Modal action bar */}
            <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-2 bg-gray-50 shrink-0">
              <button
                onClick={() => setStatementCustomer(null)}
                className="px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const printContents = document.getElementById('printable-statement')?.innerHTML;
                  const w = window.open();
                  if (w) {
                    w.document.write(`
                      <html>
                        <head>
                          <title>Customer Statement - ${statementCustomer.name}</title>
                          <style>
                            body { font-family: sans-serif; padding: 40px; color: #333; }
                            .bg-gray-50 { background-color: #f9f9f9; padding: 15px; border-radius: 6px; border: 1px solid #eee; }
                            .grid-cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                            .text-red-600 { color: #d32f2f; }
                            .bg-amber-50 { background-color: #fff8e1; color: #b78103; padding: 15px; border-left: 4px solid #ffb300; }
                            .text-right { text-align: right; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
                            th { background-color: #f5f5f5; }
                            @media print {
                              body { padding: 0; }
                            }
                          </style>
                        </head>
                        <body>
                          ${printContents}
                          <script>
                            window.onload = function() {
                              window.print();
                              setTimeout(() => { window.close(); }, 500);
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    w.document.close();
                  }
                }}
                className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
