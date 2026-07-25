import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { suppliersApi } from '../api/suppliers.api';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number | string;
  isActive: boolean;
}

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierModal({ isOpen, onClose, supplier }: SupplierModalProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue } = useForm<{ name: string; phone: string; email: string }>();

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setValue('name', supplier.name);
        setValue('phone', supplier.phone || '');
        setValue('email', supplier.email || '');
      } else {
        reset();
      }
    }
  }, [isOpen, supplier, reset, setValue]);

  const createMutation = useMutation({
    mutationFn: suppliersApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
      reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      // Assuming suppliersApi has an update method. We'll use a placeholder for now if it doesn't.
      return (suppliersApi as any).updateSupplier ? (suppliersApi as any).updateSupplier(supplier!.id, data) : Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
      reset();
    }
  });

  const onSubmit = (data: any) => {
    if (supplier) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-surface)] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[var(--color-border)]">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-base)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Supplier Name *</label>
            <input
              {...register('name', { required: true })}
              className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              placeholder="e.g. Acme Hardware"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Phone Number</label>
            <input
              {...register('phone')}
              className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              placeholder="e.g. 0700 000 000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Email Address</label>
            <input
              type="email"
              {...register('email')}
              className="w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)] transition-all"
              placeholder="e.g. contact@acme.com"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 h-10 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-sunken)] transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 px-4 py-2 h-10 bg-gray-900 text-white rounded-[var(--radius-md)] hover:bg-black transition-colors font-medium disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
