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
}

export const customersApi = {
  getCustomers: async (filters?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await api.get('/customers', { params: filters });
    return data;
  },
  
  createCustomer: async (customerData: { name: string; phone?: string; nationalId?: string; address?: string; notes?: string }) => {
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
