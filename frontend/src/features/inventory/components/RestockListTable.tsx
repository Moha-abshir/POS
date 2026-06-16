import React, { useState } from 'react';
import { useRestockList, useUpdateRestockItem, useClearOrderedItems } from '../api/restock.api';
import { ClipboardList, CheckCircle2, Circle, Search, Trash2 } from 'lucide-react';

export function RestockListTable() {
  const { data: items = [], isLoading } = useRestockList();
  const updateItem = useUpdateRestockItem();
  const clearItems = useClearOrderedItems();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => 
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.variantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingItems = filteredItems.filter(item => !item.isOrdered);
  const orderedItems = filteredItems.filter(item => item.isOrdered);

  const handleToggle = (id: string, currentStatus: boolean) => {
    updateItem.mutate({ id, isOrdered: !currentStatus });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading restock list...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
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
        
        <button 
          onClick={() => {
            if (confirm('Are you sure you want to clear all checked items from the list?')) {
              clearItems.mutate();
            }
          }}
          disabled={orderedItems.length === 0 || clearItems.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-danger)] bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
          Clear Checked Items
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
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
                  <Circle className="text-gray-300 group-hover:text-[var(--color-accent)] transition-colors" size={24} />
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">{item.productName}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{item.variantName}</div>
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
                  <CheckCircle2 className="text-[var(--color-success)]" size={24} />
                  <div className="line-through">
                    <div className="font-medium text-[var(--color-text-primary)]">{item.productName}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{item.variantName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
