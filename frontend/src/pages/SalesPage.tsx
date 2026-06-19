import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../features/sales/api/sales.api';
import { format } from 'date-fns';
import { Search, Receipt, ArrowUpRight, Filter, Download, X } from 'lucide-react';
import { ReceiptModal } from '../features/sales/components/ReceiptModal';

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
    paymentMethod: 'CASH' | 'MPESA' | '';
  }>({
    startDate: '',
    endDate: '',
    paymentStatus: '',
    paymentMethod: '',
  });

  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', { page, limit, customerId: debouncedSearch, ...filters }],
    queryFn: () => salesApi.getSales({ 
      page, 
      limit, 
      customerId: debouncedSearch ? debouncedSearch : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      paymentStatus: filters.paymentStatus || undefined,
      paymentMethod: filters.paymentMethod || undefined,
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
        customerId: debouncedSearch ? debouncedSearch : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        paymentMethod: filters.paymentMethod || undefined,
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

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Sales History</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Audit and review all past transactions</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 h-10 bg-[var(--color-accent)] text-white rounded-md hover:bg-[var(--color-accent-hover)] transition-all shadow-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
        >
          <Download size={18} />
          <span>Export All</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search receipts or customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer border ${
                isFilterOpen || Object.values(filters).some(v => v !== '') 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              Filter
              {Object.values(filters).filter(v => v !== '').length > 0 && (
                <span className="ml-1 flex items-center justify-center w-5 h-5 bg-[var(--color-accent)] text-white rounded-full text-[10px] font-bold">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Filter Sales</h3>
                  <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={tempFilters.startDate}
                        onChange={(e) => setTempFilters({...tempFilters, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={tempFilters.endDate}
                        onChange={(e) => setTempFilters({...tempFilters, endDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Status</label>
                    <select 
                      value={tempFilters.paymentStatus}
                      onChange={(e) => setTempFilters({...tempFilters, paymentStatus: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="UNPAID">Unpaid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                    <select 
                      value={tempFilters.paymentMethod}
                      onChange={(e) => setTempFilters({...tempFilters, paymentMethod: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">All Methods</option>
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => {
                        const empty = { startDate: '', endDate: '', paymentStatus: '', paymentMethod: '' as any };
                        setTempFilters(empty);
                        setFilters(empty);
                        setIsFilterOpen(false);
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => {
                        setFilters(tempFilters);
                        setIsFilterOpen(false);
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-500 uppercase">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-500 uppercase">Receipt No.</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-500 uppercase">Customer</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-500 uppercase text-right">Amount</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-500 uppercase text-center">Status</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-500 uppercase text-center">Payment Method</th>
                <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Loading sales history...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <Receipt className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-semibold text-gray-500 mb-1">No sales found</p>
                      <p className="text-sm text-gray-400">There are no sales records matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((sale: any, index: number) => (
                  <tr key={sale.id} className={`border-b border-gray-100 h-14 transition-colors hover:bg-amber-50/30 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-6 py-2 text-sm text-gray-900 font-medium">
                      {format(new Date(sale.soldAt), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-500 font-mono">
                      {sale.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-900">
                      {sale.customerName || <span className="text-gray-400 italic">Walk-in Customer</span>}
                    </td>
                    <td className="px-6 py-2 text-sm text-right font-bold text-gray-900">
                      KSH {Number(sale.totalAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                        sale.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-xs font-medium text-gray-600">
                        {sale.paymentMethod}
                        {sale.mpesaRef && <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{sale.mpesaRef}</span>}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-right">
                      <button 
                        onClick={() => setSelectedSaleId(sale.id)}
                        className="p-2 text-gray-400 hover:text-[var(--color-accent)] hover:bg-amber-50 rounded-md transition-colors cursor-pointer" 
                        title="View Receipt Details"
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, meta.total)} of {meta.total} records
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
