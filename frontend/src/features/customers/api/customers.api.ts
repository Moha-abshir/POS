import { api } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  notes?: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  lastPurchaseDate?: string;
  type?: 'INDIVIDUAL' | 'BUSINESS';
  hasActiveCredit?: boolean;
  purchaseCount?: number;
}

export interface CustomerPayment {
  id: string;
  amount: string | number;
  method: 'CASH' | 'MPESA';
  mpesaReceiptNumber?: string;
  paidAt: string;
  createdBy: string;
}

export const customersApi = {
  getCustomers: async (filters?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await api.get('/customers', { params: filters });
    return data;
  },
  
  createCustomer: async (customerData: { name: string; phone?: string; nationalId?: string; address?: string; notes?: string; type?: 'INDIVIDUAL' | 'BUSINESS' }) => {
    const { data } = await api.post('/customers', customerData);
    return data.data;
  },
  
  updateCustomer: async (id: string, customerData: Partial<Customer>) => {
    const { data } = await api.patch(`/customers/${id}`, customerData);
    return data.data;
  },

  getCustomerPurchases: async (id: string) => {
    const { data } = await api.get(`/customers/${id}/purchases`);
    return data.data;
  },

  recordPayment: async (id: string, paymentData: { amount: number; method: 'CASH' | 'MPESA'; mpesaReceiptNumber?: string }) => {
    const { data } = await api.post(`/customers/${id}/payments`, paymentData);
    return data.data;
  },

  getCustomerPayments: async (id: string) => {
    const { data } = await api.get(`/customers/${id}/payments`);
    return data.data;
  }
};

export const useCustomers = (filters?: { page?: number; limit?: number; search?: string }) => {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customersApi.getCustomers(filters),
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Customer> & { id: string }) => customersApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useCustomerPurchases = (id?: string) => {
  return useQuery({
    queryKey: ['customers', id, 'purchases'],
    queryFn: () => id ? customersApi.getCustomerPurchases(id) : Promise.resolve([]),
    enabled: !!id,
  });
};

export const useRecordCustomerPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount: number; method: 'CASH' | 'MPESA'; mpesaReceiptNumber?: string }) => 
      customersApi.recordPayment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id, 'payments'] });
    },
  });
};

export const useCustomerPayments = (id?: string) => {
  return useQuery<CustomerPayment[]>({
    queryKey: ['customers', id, 'payments'],
    queryFn: () => id ? customersApi.getCustomerPayments(id) : Promise.resolve([]),
    enabled: !!id,
  });
};
