import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../features/sales/api/sales.api';
import { format } from 'date-fns';
import { Search, Receipt, ArrowUpRight, Filter, Download } from 'lucide-react';

export function SalesPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', { page, limit, customerId: debouncedSearch }],
    queryFn: () => salesApi.getSales({ page, limit, customerId: debouncedSearch ? debouncedSearch : undefined }), // We can refine customer search later, for now we just pass it to the API
  });

  const sales = salesData?.data || [];
  const meta = salesData?.meta || { total: 0 };
  const totalPages = Math.ceil(meta.total / limit);

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Sales History</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Audit and review all past transactions</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 h-10 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm font-medium cursor-pointer"
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
              className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
            <Filter size={16} />
            Filter
          </button>
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
                  <tr key={sale.id} className={`border-b border-gray-100 h-14 transition-colors hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
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
                      <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer" title="View Receipt Details">
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
    </div>
  );
}
