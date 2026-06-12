import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi, type Supplier } from '../features/suppliers/api/suppliers.api';
import { Plus, Search, Truck, Edit } from 'lucide-react';
import { SupplierModal } from '../features/suppliers/components/SupplierModal';

export function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', debouncedSearch],
    queryFn: () => suppliersApi.getSuppliers(debouncedSearch),
  });

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Suppliers</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage your vendors and track balances</p>
        </div>
        <button
          onClick={handleAddSupplier}
          className="flex items-center gap-2 px-5 py-2 h-10 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none cursor-pointer"
        >
          <Plus size={18} />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
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
              {isLoading ? (
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
                suppliers.map((supplier, index) => (
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
                    <td className="px-6 py-0 text-right">
                      <button
                        onClick={() => handleEditSupplier(supplier)}
                        className="p-2 text-gray-400 hover:text-[var(--color-accent)] transition-colors inline-flex items-center justify-center cursor-pointer"
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
      </div>

      <SupplierModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        supplier={selectedSupplier} 
      />
    </div>
  );
}
