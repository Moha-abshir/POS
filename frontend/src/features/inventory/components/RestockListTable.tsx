import React, { useState } from 'react';
import { useRestockList, useUpdateRestockItem, useClearOrderedItems } from '../api/restock.api';
import { ClipboardList, CheckCircle2, Circle, Search, Trash2, Package } from 'lucide-react';
import { useAuthStore } from '../../auth/stores/auth.store';

export function RestockListTable() {
  const { data: items = [], isLoading } = useRestockList();
  const updateItem = useUpdateRestockItem();
  const clearItems = useClearOrderedItems();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const filteredItems = items.filter(item => 
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.variantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingItems = filteredItems.filter(item => !item.isOrdered);
  const orderedItems = filteredItems.filter(item => item.isOrdered);

  const handleToggle = (id: string, currentStatus: boolean) => {
    updateItem.mutate({ id, isOrdered: !currentStatus });
  };



  const currentUser = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden relative">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-white">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search items..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
        
        {currentUser?.role !== 'CASHIER' && (
          <button 
            onClick={() => setIsClearModalOpen(true)}
            disabled={orderedItems.length === 0 || clearItems.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-danger)] bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Clear Checked Items
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Pending Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                <ClipboardList size={16} /> To Order ({pendingItems.length})
              </h3>
              
              {pendingItems.length === 0 ? (
                 <div className="text-center p-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">No pending items to restock.</div>
              ) : (
                <div className="space-y-1">
                  {pendingItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleToggle(item.id, item.isOrdered)}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors border border-transparent hover:border-gray-100"
                    >
                      <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                        <div className="absolute inset-0 transition-transform duration-300 scale-100 opacity-100">
                          <Circle className="text-gray-300 group-hover:text-[var(--color-accent)] w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[var(--color-text-primary)]">{item.productName}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{item.variantName}</div>
                      </div>
                      <div className="text-sm font-mono text-gray-500 flex items-center gap-1.5 shrink-0 bg-gray-50 px-2 py-1 rounded-md">
                        <Package size={14} />
                        Stock: {item.currentStock || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ordered Section */}
            {orderedItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Ordered ({orderedItems.length})
                </h3>
                
                <div className="space-y-1">
                  {orderedItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleToggle(item.id, item.isOrdered)}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors opacity-60"
                    >
                      <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                        <div className="absolute inset-0 transition-transform duration-300 scale-100 opacity-100">
                          <CheckCircle2 className="text-[var(--color-success)] w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-1 line-through">
                        <div className="font-medium text-[var(--color-text-primary)]">{item.productName}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{item.variantName}</div>
                      </div>
                      <div className="text-sm font-mono text-gray-400 flex items-center gap-1.5 shrink-0 px-2 py-1">
                        <Package size={14} />
                        Stock: {item.currentStock || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Clear Modal */}
      {isClearModalOpen && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[var(--color-border)] rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Clear Checked Items?</h3>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove all ordered items from your restock list. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsClearModalOpen(false)} 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  clearItems.mutate();
                  setIsClearModalOpen(false);
                }} 
                disabled={clearItems.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Clear Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
