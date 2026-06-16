import { api } from '../../../lib/api';

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
  }
};
