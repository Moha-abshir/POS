import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi, type Supplier } from '../features/suppliers/api/suppliers.api';
import { inventoryApi } from '../features/inventory/api/inventory.api';
import { Plus, Search, Truck, Edit, Package, ArrowDownRight, DollarSign, Filter, X } from 'lucide-react';
import { SupplierModal } from '../features/suppliers/components/SupplierModal';
import { PurchaseModal } from '../features/inventory/components/PurchaseModal';
import { RecordPaymentModal } from '../features/suppliers/components/RecordPaymentModal';

export function PurchasingPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentSupplier, setSelectedPaymentSupplier] = useState<Supplier | null>(null);
  
  const queryClient = useQueryClient();

  const [purchaseFilters, setPurchaseFilters] = useState({
    startDate: '',
    endDate: '',
    product: '',
    supplier: '',
    invoiceRef: '',
    mpesaRef: '',
  });
  const [tempPurchaseFilters, setTempPurchaseFilters] = useState(purchaseFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers', debouncedSearch],
    queryFn: () => suppliersApi.getSuppliers(debouncedSearch),
  });

  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => suppliersApi.getSuppliers(),
  });

  const { data: movements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ['inventory', 'movements', purchaseFilters],
    queryFn: () => inventoryApi.getMovements({ type: 'PURCHASE', ...purchaseFilters }),
  });

  const handleOpenFilters = () => {
    setTempPurchaseFilters(purchaseFilters);
    setIsFilterOpen(true);
  };

  const handleApplyFilters = () => {
    setPurchaseFilters(tempPurchaseFilters);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = { startDate: '', endDate: '', product: '', supplier: '', invoiceRef: '', mpesaRef: '' };
    setTempPurchaseFilters(emptyFilters);
    setPurchaseFilters(emptyFilters);
    setIsFilterOpen(false);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Purchasing</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage your vendors and purchase history</p>
        </div>
        
        {activeTab === 'suppliers' ? (
          <button
            onClick={handleAddSupplier}
            className="flex items-center gap-2 px-5 py-2 h-10 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Supplier</span>
          </button>
        ) : (
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2 h-10 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none cursor-pointer"
          >
            <Package size={18} />
            <span>Record Purchase</span>
          </button>
        )}
      </div>

      <div className="flex space-x-1 border-b border-[var(--color-border)] mb-4">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'suppliers' 
            ? 'border-[var(--color-accent)] text-[var(--color-accent)]' 
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'purchases' 
            ? 'border-[var(--color-accent)] text-[var(--color-accent)]' 
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Purchases
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
        {activeTab === 'suppliers' && (
          <>
            <div className="p-4 border-b border-[var(--color-border)]">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-[var(--color-bg-sunken)] border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-transparent focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white border-b border-[var(--color-border)]">
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Name</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Contact</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase text-right">Balance</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase text-right">Status</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingSuppliers ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading suppliers...</td>
                    </tr>
                  ) : suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                          <Truck className="h-12 w-12 text-gray-300 mb-4" />
                          <p className="text-lg font-semibold text-gray-500 mb-1">No suppliers found</p>
                          <p className="text-sm text-gray-400">Add your first supplier to start purchasing.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier: Supplier, index: number) => (
                      <tr key={supplier.id} className={`border-b border-[var(--color-border)] h-12 transition-colors duration-150 hover:bg-[var(--color-bg-sunken)] ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]'}`}>
                        <td className="px-6 py-0 font-medium text-[var(--color-text-primary)]">{supplier.name}</td>
                        <td className="px-6 py-0 text-[var(--color-text-secondary)]">
                          <div>{supplier.phone || '-'}</div>
                          <div className="text-xs">{supplier.email || '-'}</div>
                        </td>
                        <td className="px-6 py-0 text-right">
                          <span className={Number(supplier.balance) > 0 ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-success)] font-medium'}>
                            KSH {Number(supplier.balance).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-0 text-right">
                          <span className={`inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold uppercase tracking-wider ${
                            supplier.isActive ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                          }`}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-0 text-right space-x-2">
                          {Number(supplier.balance) > 0 && (
                            <button
                              onClick={() => {
                                setSelectedPaymentSupplier(supplier);
                                setIsPaymentModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Record Payment"
                            >
                              <DollarSign size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditSupplier(supplier)}
                            className="p-2 text-gray-400 hover:text-[var(--color-accent)] transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Edit Supplier"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'purchases' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] bg-white flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Purchase History</h2>
              <button 
                onClick={handleOpenFilters} 
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <Filter size={16} /> Filters
              </button>
            </div>
            
            {isFilterOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[var(--color-border)] flex flex-col">
                  <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-bold">Filter Purchases</h3>
                    <button type="button" onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input type="date" value={tempPurchaseFilters.startDate} onChange={e => setTempPurchaseFilters(p => ({ ...p, startDate: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input type="date" value={tempPurchaseFilters.endDate} onChange={e => setTempPurchaseFilters(p => ({ ...p, endDate: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                      <input type="text" placeholder="Search product..." value={tempPurchaseFilters.product} onChange={e => setTempPurchaseFilters(p => ({ ...p, product: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                      <select 
                        value={tempPurchaseFilters.supplier} 
                        onChange={e => setTempPurchaseFilters(p => ({ ...p, supplier: e.target.value }))} 
                        className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none bg-white"
                      >
                        <option value="">All Suppliers</option>
                        {allSuppliers.map((s: Supplier) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Ref</label>
                      <input type="text" placeholder="Search invoice..." value={tempPurchaseFilters.invoiceRef} onChange={e => setTempPurchaseFilters(p => ({ ...p, invoiceRef: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Ref</label>
                      <input type="text" placeholder="Search ref..." value={tempPurchaseFilters.mpesaRef} onChange={e => setTempPurchaseFilters(p => ({ ...p, mpesaRef: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none" />
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <button onClick={handleClearFilters} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm">
                      Clear
                    </button>
                    <button onClick={handleApplyFilters} className="px-4 py-2 bg-[var(--color-accent)] text-white font-semibold rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm">
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-white border-b border-[var(--color-border)]">
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Date & Time</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Product</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Supplier</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Type</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Invoice Ref</th>
                    <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">M-Pesa Ref</th>
                  </tr>
                </thead>
              <tbody>
                {isLoadingMovements ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading purchases...</td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <Package className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-lg font-semibold text-gray-500 mb-1">No purchases found</p>
                        <p className="text-sm text-gray-400">Record a purchase or change filters to view history here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  movements.map((movement: any, index: number) => {
                    const qty = Number(movement.quantityChange);
                    return (
                      <tr key={movement.id} className={`border-b border-[var(--color-border)] h-12 transition-colors duration-150 hover:bg-[var(--color-bg-sunken)] ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]'}`}>
                        <td className="px-6 py-0 text-[var(--color-text-secondary)]">
                          {new Date(movement.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-0 font-medium text-[var(--color-text-primary)]">{movement.productName}</td>
                        <td className="px-6 py-0 text-[var(--color-text-secondary)]">{movement.supplierName || '-'}</td>
                        <td className="px-6 py-0">
                          <div className="flex items-center gap-2">
                            <ArrowDownRight className="text-emerald-500" size={18} />
                            <span className="text-[var(--color-text-secondary)] font-medium text-xs tracking-wider uppercase">{movement.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-0">
                          <span className="inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-bold tracking-wider bg-[var(--color-success-bg)] text-[var(--color-success)]">
                            +{qty}
                          </span>
                        </td>
                        <td className="px-6 py-0 text-[var(--color-text-muted)] truncate max-w-[150px]" title={movement.invoiceRef || ''}>
                          {movement.invoiceRef || '-'}
                        </td>
                        <td className="px-6 py-0 font-medium text-[var(--color-text-primary)] truncate max-w-[150px]" title={movement.mpesaRef || ''}>
                          {movement.mpesaRef || '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        supplier={selectedSupplier}
      />
      
      {isPurchaseModalOpen && (
        <PurchaseModal onClose={() => setIsPurchaseModalOpen(false)} />
      )}

      {isPaymentModalOpen && selectedPaymentSupplier && (
        <RecordPaymentModal
          supplier={selectedPaymentSupplier}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedPaymentSupplier(null);
          }}
        />
      )}
    </div>
  );
}
