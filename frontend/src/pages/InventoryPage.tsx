import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../features/inventory/api/inventory.api';
import { Package, ArrowDownRight, ArrowUpRight, Wrench, AlertTriangle, RefreshCcw } from 'lucide-react';
import { PurchaseModal } from '../features/inventory/components/PurchaseModal';
import { AdjustStockModal } from '../features/inventory/components/AdjustStockModal';

export function InventoryPage() {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Track every stock movement across your business</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Wrench size={18} />
            <span>Adjust / Damage</span>
          </button>
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Package size={18} />
            <span>Record Purchase</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Change</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading ledger...</td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-900">No stock movements yet</p>
                    <p className="text-sm mt-1">Record a purchase or manual adjustment to see history.</p>
                  </td>
                </tr>
              ) : (
                movements.map((movement) => {
                  const qty = Number(movement.quantityChange);
                  const isPositive = qty > 0;
                  return (
                    <tr key={movement.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(movement.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{movement.productName}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.type)}
                          <span className="text-slate-700 font-medium">{movement.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                          isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isPositive ? '+' : ''}{qty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]" title={movement.notes || ''}>
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

      {isPurchaseModalOpen && (
        <PurchaseModal onClose={() => setIsPurchaseModalOpen(false)} />
      )}

      {isAdjustModalOpen && (
        <AdjustStockModal onClose={() => setIsAdjustModalOpen(false)} />
      )}
    </div>
  );
}
