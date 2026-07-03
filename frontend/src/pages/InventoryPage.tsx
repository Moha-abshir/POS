import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../features/inventory/api/inventory.api';
import { Package, ArrowDownRight, ArrowUpRight, Wrench, AlertTriangle, RefreshCcw } from 'lucide-react';
import { AdjustStockModal } from '../features/inventory/components/AdjustStockModal';
import { RestockListTable } from '../features/inventory/components/RestockListTable';
import { ReportDamageModal } from '../features/inventory/components/ReportDamageModal';
import { DamagesLogTable } from '../features/inventory/components/DamagesLogTable';
import { NegativeStockTable } from '../features/inventory/components/NegativeStockTable';
import { TableSkeleton } from '../components/ui/Loading';
import { useAuthStore } from '../features/auth/stores/auth.store';

export function InventoryPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [view, setView] = useState<'ledger' | 'restock' | 'damages' | 'negative'>('ledger');
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
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-4 md:space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
            {view === 'ledger' ? 'Inventory Ledger' : view === 'restock' ? 'Restock List' : view === 'damages' ? 'Damages Log' : 'Negative Stock'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {view === 'ledger' ? 'Track every stock movement across your business' : view === 'restock' ? 'Manage items that need to be reordered' : view === 'damages' ? 'Track lost, damaged, or expired items' : 'Quickly resolve items that have negative inventory levels'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row xl:flex-row gap-3 sm:gap-4 items-stretch sm:items-center w-full xl:w-auto">
          <div className="bg-[var(--color-bg-sunken)] p-1 rounded-lg flex overflow-x-auto border border-[var(--color-border)] hide-scrollbar w-full sm:w-auto shrink-0">
            <button 
              onClick={() => setView('ledger')} 
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${view === 'ledger' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Ledger
            </button>
            <button 
              onClick={() => setView('restock')} 
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${view === 'restock' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Restock List
            </button>
            <button 
              onClick={() => setView('damages')} 
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${view === 'damages' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              Damages Log
            </button>
            {currentUser?.role !== 'CASHIER' && (
              <button 
                onClick={() => setView('negative')} 
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${view === 'negative' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
              >
                Negative Stock
              </button>
            )}
          </div>
          
          <div className="flex flex-row gap-2 items-center w-full sm:w-auto shrink-0">
            <button
              onClick={() => setIsDamageModalOpen(true)}
              className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 sm:px-4 py-2 h-10 bg-red-50 border border-red-100 text-red-600 rounded-[var(--radius-md)] hover:bg-red-100 transition-colors shadow-sm text-sm font-semibold select-none cursor-pointer"
            >
              <AlertTriangle size={18} />
              <span>Report Damage</span>
            </button>
            {currentUser?.role !== 'CASHIER' && (
              <button
                onClick={() => setIsAdjustModalOpen(true)}
                className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 sm:px-4 py-2 h-10 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface)] transition-colors shadow-sm text-sm font-semibold select-none cursor-pointer"
              >
                <Wrench size={18} />
                <span>Adjust Stock</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {view === 'ledger' ? (
        <div className="bg-white rounded-xl shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-[var(--color-border)]">
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Product</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Type</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase text-right">Change</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <TableSkeleton rows={5} cols={5} />
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <Package className="h-12 w-12 text-[var(--color-text-muted)] mb-4" />
                        <p className="text-lg font-semibold text-[var(--color-text-secondary)] mb-1">No stock movements yet</p>
                        <p className="text-sm text-[var(--color-text-muted)]">Record a purchase or manual adjustment to see history.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  movements.map((movement, index) => {
                    const qty = Number(movement.quantityChange);
                    const isPositive = qty > 0;
                    
                    const getTypeBadgeStyle = (type: string) => {
                      switch(type) {
                        case 'PURCHASE': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                        case 'SALE': return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                        case 'REFUND': return 'bg-blue-50 text-blue-700 border border-blue-200';
                        case 'DAMAGE': return 'bg-red-50 text-red-700 border border-red-200';
                        case 'ADJUSTMENT': return 'bg-amber-50 text-amber-700 border border-amber-200';
                        default: return 'bg-gray-50 text-gray-700 border border-gray-200';
                      }
                    };

                    return (
                      <tr key={movement.id} className={`border-b border-[var(--color-border)] h-12 transition-colors duration-150 hover:bg-[var(--color-bg-base)] ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]/20'}`}>
                        <td className="px-6 py-2 text-sm text-[var(--color-text-secondary)]">
                          {new Date(movement.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-2 font-semibold text-sm text-[var(--color-text-primary)]">
                          {movement.productName}
                          {movement.variantName && <span className="text-[var(--color-text-muted)] font-normal text-xs ml-1.5">({movement.variantName})</span>}
                        </td>
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.type)}
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold uppercase tracking-wider ${getTypeBadgeStyle(movement.type)}`}>
                              {movement.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-right">
                          <span className={`inline-flex items-center justify-center min-w-[48px] px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-bold tracking-wider ${
                            isPositive ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-green-200' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-red-200'
                          }`}>
                            {isPositive ? '+' : ''}{qty}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-sm text-[var(--color-text-secondary)] max-w-[250px] break-words" title={movement.notes || ''}>
                          {movement.notes ? (
                            (() => {
                              const parts = movement.notes.split(': ');
                              if (parts.length > 1) {
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-[var(--color-text-primary)]">{parts[0]}</span>
                                    <span className="text-xs text-[var(--color-text-muted)] italic mt-0.5">{parts.slice(1).join(': ')}</span>
                                  </div>
                                );
                              }
                              return movement.notes;
                            })()
                          ) : (
                            '-'
                          )}
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
      ) : view === 'damages' ? (
        <DamagesLogTable />
      ) : (
        <NegativeStockTable />
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
