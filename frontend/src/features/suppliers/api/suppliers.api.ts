import { api } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance: string;
  isActive: boolean;
}

export const suppliersApi = {
  getSuppliers: async (search?: string) => {
    const res = await api.get('/suppliers', { params: { search } });
    return res.data.data as Supplier[];
  },

  createSupplier: async (data: { name: string; phone?: string; email?: string }) => {
    const res = await api.post('/suppliers', data);
    return res.data.data as Supplier;
  },

  updateSupplier: async (id: string, data: Partial<Supplier>) => {
    const res = await api.put(`/suppliers/${id}`, data);
    return res.data.data as Supplier;
  },

  recordPayment: async (supplierId: string, data: { amount: number; method: 'CASH' | 'MPESA'; mpesaReceiptNumber?: string }) => {
    const res = await api.post(`/suppliers/${supplierId}/payments`, data);
    return res.data.data;
  },

  getSupplierPayments: async (supplierId: string) => {
    const res = await api.get(`/suppliers/${supplierId}/payments`);
    return res.data.data;
  },

  getSupplierPurchases: async (supplierId: string) => {
    const res = await api.get(`/suppliers/${supplierId}/purchases`);
    return res.data.data;
  }
};

export const useSupplierPayments = (supplierId?: string) => {
  return useQuery({
    queryKey: ['supplier-payments', supplierId],
    queryFn: () => suppliersApi.getSupplierPayments(supplierId!),
    enabled: !!supplierId,
  });
};

export const useSupplierPurchases = (supplierId?: string) => {
  return useQuery({
    queryKey: ['supplier-purchases', supplierId],
    queryFn: () => suppliersApi.getSupplierPurchases(supplierId!),
    enabled: !!supplierId,
  });
};
