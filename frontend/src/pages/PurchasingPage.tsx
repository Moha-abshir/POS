import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi, type Supplier } from '../features/suppliers/api/suppliers.api';
import { inventoryApi } from '../features/inventory/api/inventory.api';
import { Plus, Search, Truck, Edit, Package, ArrowDownRight, DollarSign, Filter, X, Eye, Upload, Download } from 'lucide-react';
import { SupplierModal } from '../features/suppliers/components/SupplierModal';
import { SupplierDetailsModal } from '../features/suppliers/components/SupplierDetailsModal';
import { PurchaseModal } from '../features/inventory/components/PurchaseModal';
import { RecordPaymentModal } from '../features/suppliers/components/RecordPaymentModal';
import { TableSkeleton, LoadingSpinner } from '../components/ui/Loading';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { ImportModal } from '../components/ui/ImportModal';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';

export function PurchasingPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentSupplier, setSelectedPaymentSupplier] = useState<Supplier | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailsSupplier, setSelectedDetailsSupplier] = useState<Supplier | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const [purchaseFilters, setPurchaseFilters] = useState({
    startDate: '',
    endDate: '',
    product: '',
    supplier: '',
    invoiceRef: '',
    mpesaRef: '',
    paymentMethod: '',
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
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => suppliersApi.getSuppliers(),
    staleTime: 15 * 60 * 1000, // 15 minutes
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
    const emptyFilters = { startDate: '', endDate: '', product: '', supplier: '', invoiceRef: '', mpesaRef: '', paymentMethod: '' };
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

  const handleExportSuppliers = async () => {
    try {
      const { data } = await api.get('/export/suppliers', { responseType: 'text' });
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Suppliers exported successfully');
    } catch (error) {
      toast.error('Failed to export suppliers');
    }
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  };

  const templateHeaders = ['Name', 'Phone', 'Email'];
  const sampleRow = ['"Supplier ACME"', '"0722111222"', '"info@acme.com"'];

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Purchasing</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">Manage your vendors and purchase history</p>
        </div>
        
        <div className="flex flex-row gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar shrink-0">
          {activeTab === 'suppliers' && (
            <>
              {currentUser?.role !== 'CASHIER' && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-3 md:px-4 h-10 rounded-[var(--radius-md)] font-semibold text-xs md:text-sm transition-all shrink-0 select-none cursor-pointer"
                >
                  <Download size={16} className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Import</span>
                </button>
              )}
              <button
                onClick={handleExportSuppliers}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 md:px-4 h-10 rounded-[var(--radius-md)] font-semibold text-xs md:text-sm transition-all shrink-0 select-none cursor-pointer"
              >
                <Upload size={16} className="w-4 h-4 md:w-5 md:h-5" />
                <span>Export</span>
              </button>
              {currentUser?.role !== 'CASHIER' && (
                <button
                  onClick={handleAddSupplier}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 md:px-5 py-2 h-10 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none cursor-pointer whitespace-nowrap text-xs md:text-sm"
                >
                  <Plus size={18} className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                  <span>Add Supplier</span>
                </button>
              )}
            </>
          )}
          {activeTab === 'purchases' && currentUser?.role !== 'CASHIER' && (
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-5 py-2 h-10 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none cursor-pointer whitespace-nowrap text-sm"
            >
              <Package size={18} className="w-[18px] h-[18px]" />
              <span>Record Purchase</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-1 border-b border-[var(--color-border)] mb-2 md:mb-4 overflow-x-auto hide-scrollbar w-full">
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
            <div className="p-4 border-b border-[var(--color-border)] bg-white/50">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all placeholder:text-[var(--color-text-muted)]"
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
                      <td colSpan={5} className="p-0">
                        <TableSkeleton rows={5} cols={5} />
                      </td>
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
                          {Number(supplier.balance) > 0 && currentUser?.role !== 'CASHIER' && (
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
                            onClick={() => {
                              setSelectedDetailsSupplier(supplier);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="View Ledger"
                          >
                            <Eye size={16} />
                          </button>
                          {currentUser?.role !== 'CASHIER' && (
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="p-2 text-gray-400 hover:text-[var(--color-accent)] transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Edit Supplier"
                            >
                              <Edit size={16} />
                            </button>
                          )}
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
            <div className="p-3 md:p-4 border-b border-[var(--color-border)] bg-white flex justify-between items-center gap-2">
              <h2 className="text-base md:text-lg font-semibold text-[var(--color-text-primary)] whitespace-nowrap truncate">Purchase History</h2>
              <button 
                onClick={handleOpenFilters} 
                className="flex items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold border rounded-[var(--radius-md)] transition-all bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-base)] cursor-pointer shrink-0"
              >
                <Filter size={16} className="w-4 h-4" /> Filters
              </button>
            </div>
            
            {isFilterOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-[var(--radius-lg)] shadow-2xl w-full max-w-lg border border-[var(--color-border)] flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-white">
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">Filter Purchases</h3>
                    <button type="button" onClick={() => setIsFilterOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all cursor-pointer">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">Start Date</label>
                      <input type="date" value={tempPurchaseFilters.startDate} onChange={e => setTempPurchaseFilters(p => ({ ...p, startDate: e.target.value }))} className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">End Date</label>
                      <input type="date" value={tempPurchaseFilters.endDate} onChange={e => setTempPurchaseFilters(p => ({ ...p, endDate: e.target.value }))} className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">Product</label>
                      <input type="text" placeholder="Search product..." value={tempPurchaseFilters.product} onChange={e => setTempPurchaseFilters(p => ({ ...p, product: e.target.value }))} className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">Supplier</label>
                      <select 
                        value={tempPurchaseFilters.supplier} 
                        onChange={e => setTempPurchaseFilters(p => ({ ...p, supplier: e.target.value }))} 
                        className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
                      >
                        <option value="">All Suppliers</option>
                        {allSuppliers.map((s: Supplier) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">Payment Method</label>
                      <select 
                        value={tempPurchaseFilters.paymentMethod} 
                        onChange={e => {
                          const val = e.target.value;
                          setTempPurchaseFilters(p => ({ ...p, paymentMethod: val, ...(val !== 'MPESA' && { mpesaRef: '' }) }));
                        }} 
                        className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
                      >
                        <option value="">All</option>
                        <option value="CASH">Cash</option>
                        <option value="MPESA">M-Pesa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">Invoice Ref</label>
                      <input type="text" placeholder="Search invoice..." value={tempPurchaseFilters.invoiceRef} onChange={e => setTempPurchaseFilters(p => ({ ...p, invoiceRef: e.target.value }))} className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all" />
                    </div>
                    {tempPurchaseFilters.paymentMethod === 'MPESA' && (
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">M-Pesa Ref</label>
                        <input type="text" placeholder="Search ref..." value={tempPurchaseFilters.mpesaRef} onChange={e => setTempPurchaseFilters(p => ({ ...p, mpesaRef: e.target.value }))} className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[var(--color-bg-base)]/50">
                    <button onClick={handleClearFilters} className="px-4 py-2 text-[var(--color-text-secondary)] bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border)] rounded-[var(--radius-md)] font-semibold transition-all shadow-sm cursor-pointer select-none">
                      Clear
                    </button>
                    <button onClick={handleApplyFilters} className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-[var(--radius-md)] transition-all shadow-sm cursor-pointer select-none">
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
                    <td colSpan={7} className="p-0">
                      <TableSkeleton rows={5} cols={7} />
                    </td>
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
      <SupplierDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedDetailsSupplier(null);
        }}
        supplier={selectedDetailsSupplier}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Suppliers"
        templateHeaders={templateHeaders}
        sampleRow={sampleRow}
        importUrl="/import/suppliers"
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
