import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../features/sales/api/sales.api';
import { format } from 'date-fns';
import { Search, Receipt, ArrowUpRight, Filter, Download, X, TrendingUp, CreditCard, Banknote, Smartphone, CalendarDays } from 'lucide-react';
import { ReceiptModal } from '../features/sales/components/ReceiptModal';
import { TableSkeleton } from '../components/ui/Loading';

export function SalesPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | '';
    paymentMethod: 'CASH' | 'MPESA' | 'SPLIT' | 'CREDIT' | '';
    mpesaRef: string;
  }>({
    startDate: '',
    endDate: '',
    paymentStatus: '',
    paymentMethod: '',
    mpesaRef: '',
  });

  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', { page, limit, search: debouncedSearch, ...filters }],
    queryFn: () => salesApi.getSales({ 
      page, 
      limit, 
      search: debouncedSearch ? debouncedSearch : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      paymentStatus: filters.paymentStatus || undefined,
      paymentMethod: filters.paymentMethod || undefined,
      mpesaRef: filters.mpesaRef || undefined,
    }),
  });

  const sales = salesData?.data || [];
  const meta = salesData?.meta || { total: 0 };
  const totalPages = Math.ceil(meta.total / limit);

  const handleExportCSV = async () => {
    try {
      // Fetch up to 1000 recent sales matching current filter for export
      const exportData = await salesApi.getSales({
        limit: 1000,
        search: debouncedSearch ? debouncedSearch : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        mpesaRef: filters.mpesaRef || undefined,
      });

      if (!exportData.data || exportData.data.length === 0) return;

      const headers = ['Date', 'Receipt No.', 'Customer', 'Total Amount', 'Paid Amount', 'Status', 'Payment Method', 'M-PESA Ref'];
      const rows = exportData.data.map((sale: any) => {
        const date = format(new Date(sale.soldAt), 'yyyy-MM-dd HH:mm');
        const receipt = sale.id.slice(0, 8).toUpperCase();
        return [
          `"${date}"`,
          `"${receipt}"`,
          `"${sale.customerName || 'Walk-in'}"`,
          sale.totalAmount,
          sale.amountPaid,
          `"${sale.paymentStatus}"`,
          `"${sale.paymentMethod}"`,
          `"${sale.mpesaRef || ''}"`
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export sales:', error);
    }
  };

  // Derive some top-level metrics from the currently fetched page (or mock them for the dashboard feel)
  const totalRevenue = sales.reduce((acc: number, sale: any) => acc + Number(sale.totalAmount), 0);
  const mpesaRevenue = sales.filter((s: any) => s.paymentMethod === 'MPESA').reduce((acc: number, sale: any) => acc + Number(sale.totalAmount), 0);
  const cashRevenue = sales.filter((s: any) => s.paymentMethod === 'CASH').reduce((acc: number, sale: any) => acc + Number(sale.totalAmount), 0);
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)] flex flex-col space-y-8 pb-32 md:pb-8">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sales Overview</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Monitor your financial performance and transaction history</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1C1F24] text-white rounded-2xl hover:bg-black transition-all shadow-xl shadow-black/10 font-bold text-sm cursor-pointer active:scale-95"
        >
          <Download size={18} className="text-amber-500" />
          <span>Export CSV</span>
        </button>
      </div>



      {/* Main Content Area */}
      <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col flex-1 overflow-hidden relative">
        
        {/* Floating Toolbar (Glass Pill) */}
        <div className="p-4 sm:p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between bg-white z-20">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search receipts, customers, or amounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium placeholder:text-gray-400 text-gray-900 outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2.5 px-6 py-3 text-sm font-bold rounded-2xl transition-all cursor-pointer border shadow-sm active:scale-95 ${
                isFilterOpen || Object.values(filters).some(v => v !== '') 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-500/10' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={18} className={isFilterOpen || Object.values(filters).some(v => v !== '') ? 'text-amber-600' : 'text-gray-400'} />
              Filters
              {Object.values(filters).filter(v => v !== '').length > 0 && (
                <span className="ml-1 flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold shadow-sm">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </button>

            {/* Filter Dropdown (Glassmorphism Context Menu) */}
            {isFilterOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-[calc(100vw-2rem)] max-w-[340px] bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-200 z-50 p-6 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                    <Filter size={18} className="text-amber-500" />
                    Filter Sales
                  </h3>
                  <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-all cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wider">Start Date</label>
                      <input 
                        type="date" 
                        value={tempFilters.startDate}
                        onChange={(e) => setTempFilters({...tempFilters, startDate: e.target.value})}
                        className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wider">End Date</label>
                      <input 
                        type="date" 
                        value={tempFilters.endDate}
                        onChange={(e) => setTempFilters({...tempFilters, endDate: e.target.value})}
                        className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wider">Payment Status</label>
                    <select 
                      value={tempFilters.paymentStatus}
                      onChange={(e) => setTempFilters({...tempFilters, paymentStatus: e.target.value as any})}
                      className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    >
                      <option value="">All Statuses</option>
                      <option value="PAID">Paid in Full</option>
                      <option value="PARTIAL">Partial Payment</option>
                      <option value="UNPAID">Unpaid / Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wider">Payment Method</label>
                    <select 
                      value={tempFilters.paymentMethod}
                      onChange={(e) => setTempFilters({...tempFilters, paymentMethod: e.target.value as any})}
                      className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    >
                      <option value="">All Methods</option>
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="SPLIT">Split Payment</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wider">M-Pesa Reference</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SGT8WQ12A"
                      value={tempFilters.mpesaRef}
                      onChange={(e) => setTempFilters({...tempFilters, mpesaRef: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all uppercase"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => {
                        const empty = { startDate: '', endDate: '', paymentStatus: '' as any, paymentMethod: '' as any, mpesaRef: '' };
                        setTempFilters(empty);
                        setFilters(empty);
                        setIsFilterOpen(false);
                      }}
                      className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                    <button 
                      onClick={() => {
                        setFilters(tempFilters);
                        setIsFilterOpen(false);
                      }}
                      className="flex-1 px-4 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 rounded-xl transition-all cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edge-to-Edge Data Table */}
        <div className="overflow-x-auto flex-1 relative bg-white">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th scope="col" className="px-6 py-4 text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">Transaction Info</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">Customer</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-extrabold tracking-widest text-gray-400 uppercase text-right">Amount</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-extrabold tracking-widest text-gray-400 uppercase text-center">Status</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-extrabold tracking-widest text-gray-400 uppercase text-center">Method</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-extrabold tracking-widest text-gray-400 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <TableSkeleton rows={5} cols={6} />
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100">
                        <Receipt className="h-10 w-10 text-gray-300" />
                      </div>
                      <p className="text-xl font-bold text-gray-900 mb-2 tracking-tight">No sales records found</p>
                      <p className="text-sm text-gray-500 leading-relaxed">Adjust your filters or date range to see past transactions.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((sale: any) => (
                  <tr key={sale.id} className="group hover:bg-amber-50/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 font-bold font-mono tracking-tight">
                          #{sale.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-gray-400" />
                          {format(new Date(sale.soldAt), 'MMM d, yyyy · h:mm a')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs border border-gray-200">
                          {sale.customerName ? sale.customerName.charAt(0).toUpperCase() : 'W'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {sale.customerName || <span className="text-gray-400 font-medium">Walk-in</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[15px] font-extrabold text-gray-900 tracking-tight block">
                        KSh {Number(sale.totalAmount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${
                        sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700 border border-green-200' :
                        sale.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {sale.paymentMethod === 'SPLIT' ? 'CASH & MPESA' : sale.paymentMethod}
                        </span>
                        {sale.mpesaRef && (
                          <span className="text-[10px] text-gray-400 font-mono mt-1 font-semibold tracking-wider">
                            {sale.mpesaRef}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedSaleId(sale.id)}
                        className="inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer opacity-100 focus:outline-none scale-95 hover:scale-100" 
                        title="View Receipt Details"
                      >
                        <ArrowUpRight size={20} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Glass Footer) */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center justify-between bg-white z-20">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, meta.total)} of {meta.total}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer active:scale-95"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer active:scale-95"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedSaleId && (
        <ReceiptModal 
          saleId={selectedSaleId} 
          onClose={() => setSelectedSaleId(null)} 
        />
      )}
    </div>
  );
}
