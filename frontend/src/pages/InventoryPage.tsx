import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../features/inventory/api/inventory.api';
import { Package, ArrowDownRight, ArrowUpRight, Wrench, AlertTriangle, RefreshCcw } from 'lucide-react';
import { AdjustStockModal } from '../features/inventory/components/AdjustStockModal';
import { RestockListTable } from '../features/inventory/components/RestockListTable';
import { ReportDamageModal } from '../features/inventory/components/ReportDamageModal';
import { DamagesLogTable } from '../features/inventory/components/DamagesLogTable';

export function InventoryPage() {
  const [view, setView] = useState<'ledger' | 'restock' | 'damages'>('ledger');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inventory', 'movements'],
    queryFn: inventoryApi.getMovements,
  });

  const getMovementIcon = (type: string) => {
    switch(type) {
      case 'PURCHASE': return <ArrowDownRight className="text-emerald-500" size={18} />;
      case 'SALE': return <ArrowUpRight className="text-indigo-500" size={18} />;
      case 'REFUND': return <RefreshCcw className="text-blue-500" size={18} />;
      case 'DAMAGE': return <AlertTriangle className="text-red-500" size={18} />;
      case 'ADJUSTMENT': return <Wrench className="text-amber-500" size={18} />;
      default: return <Package className="text-slate-500" size={18} />;
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
            {view === 'ledger' ? 'Inventory Ledger' : view === 'restock' ? 'Restock List' : 'Damages Log'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {view === 'ledger' ? 'Track every stock movement across your business' : view === 'restock' ? 'Manage items that need to be reordered' : 'Track lost, damaged, or expired items'}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-[var(--color-bg-sunken)] p-1 rounded-lg flex border border-[var(--color-border)]">
            <button 
              onClick={() => setView('ledger')} 
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'ledger' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Ledger
            </button>
            <button 
              onClick={() => setView('restock')} 
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'restock' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Restock List
            </button>
            <button 
              onClick={() => setView('damages')} 
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'damages' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Damages Log
            </button>
          </div>
          
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setIsDamageModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 h-10 bg-red-50 border border-red-100 text-red-600 rounded-[var(--radius-md)] hover:bg-red-100 transition-colors shadow-sm font-semibold select-none cursor-pointer"
            >
              <AlertTriangle size={18} />
              <span>Report Damage</span>
            </button>
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 h-10 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface)] transition-colors shadow-sm font-semibold select-none cursor-pointer"
            >
              <Wrench size={18} />
              <span>Adjust Stock</span>
            </button>
          </div>
        </div>
      </div>

      {view === 'ledger' ? (
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-[var(--color-border)]">
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Product</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Type</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase text-right">Change</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading ledger...</td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <Package className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-lg font-semibold text-gray-500 mb-1">No stock movements yet</p>
                        <p className="text-sm text-gray-400">Record a purchase or manual adjustment to see history.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  movements.map((movement, index) => {
                    const qty = Number(movement.quantityChange);
                    const isPositive = qty > 0;
                    return (
                      <tr key={movement.id} className={`border-b border-[var(--color-border)] h-12 transition-colors duration-150 hover:bg-[var(--color-bg-sunken)] ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]'}`}>
                        <td className="px-6 py-0 text-[var(--color-text-secondary)]">
                          {new Date(movement.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-0 font-medium text-[var(--color-text-primary)]">
                          {movement.productName}
                          {movement.variantName && <span className="text-gray-400 font-normal text-sm ml-1.5">({movement.variantName})</span>}
                        </td>
                        <td className="px-6 py-0">
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.type)}
                            <span className="text-[var(--color-text-secondary)] font-medium text-xs tracking-wider uppercase">{movement.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-0 text-right">
                          <span className={`inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-bold tracking-wider ${
                            isPositive ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
                          }`}>
                            {isPositive ? '+' : ''}{qty}
                          </span>
                        </td>
                        <td className="px-6 py-0 text-[var(--color-text-muted)] truncate max-w-[200px]" title={movement.notes || ''}>
                          {movement.notes || '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : view === 'restock' ? (
        <RestockListTable />
      ) : (
        <DamagesLogTable />
      )}

      {isAdjustModalOpen && (
        <AdjustStockModal onClose={() => setIsAdjustModalOpen(false)} />
      )}
      {isDamageModalOpen && (
        <ReportDamageModal onClose={() => setIsDamageModalOpen(false)} />
      )}
    </div>
  );
}
