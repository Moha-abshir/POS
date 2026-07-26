import { api } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../core/offline/offlineDatabase';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  notes?: string;
  balance: number;
  baseSalary?: number | string;
  periodOwed?: string;
  isActive: boolean;
  createdAt: string;
  lastPurchaseDate?: string;
  type?: 'INDIVIDUAL' | 'BUSINESS' | 'EMPLOYEE';
  hasActiveCredit?: boolean;
  purchaseCount?: number;
  email?: string;
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
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
      const { data } = await api.get('/customers', { params: filters });
      
      if (data && Array.isArray(data.data)) {
        await db.customers.clear();
        for (const c of data.data) {
          await db.customers.put({
            id: c.id,
            name: c.name,
            phoneNumber: c.phone || '',
            nationalId: c.nationalId || '',
            email: c.email || '',
            address: c.address || '',
            notes: c.notes || '',
            balance: (c.balance || 0).toString(),
            type: c.type || 'INDIVIDUAL',
            baseSalary: (c.baseSalary || 0).toString(),
            periodOwed: c.periodOwed || '',
            hasActiveCredit: !!c.hasActiveCredit
          });
        }
      }
      return data;
    } catch (error) {
      const localCustomers = await db.customers.toArray();
      if (localCustomers.length > 0) {
        return {
          data: localCustomers.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phoneNumber,
            nationalId: c.nationalId,
            email: c.email,
            address: c.address,
            notes: c.notes,
            balance: Number(c.balance) || 0,
            type: c.type || 'INDIVIDUAL',
            baseSalary: Number(c.baseSalary) || 0,
            periodOwed: c.periodOwed,
            hasActiveCredit: c.hasActiveCredit,
            isActive: true,
            createdAt: new Date().toISOString()
          })),
          meta: { total: localCustomers.length, limit: filters?.limit || 1000, offset: 0 }
        };
      }
      return { data: [], meta: { total: 0, limit: filters?.limit || 50, offset: 0 } };
    }
  },
  
  createCustomer: async (customerData: {
    name: string;
    phone?: string;
    nationalId?: string;
    address?: string;
    notes?: string;
    type?: 'INDIVIDUAL' | 'BUSINESS' | 'EMPLOYEE';
    amountOwed?: number;
    periodOwed?: string;
    baseSalary?: number;
  }) => {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { data } = await api.post('/customers', customerData);
      
      if (data?.data) {
        await db.customers.put({
          id: data.data.id,
          name: data.data.name,
          phoneNumber: data.data.phone || '',
          nationalId: data.data.nationalId || '',
          email: data.data.email || '',
          address: data.data.address || '',
          notes: data.data.notes || '',
          balance: (data.data.balance || 0).toString(),
          type: data.data.type || 'INDIVIDUAL',
          baseSalary: (data.data.baseSalary || 0).toString(),
          periodOwed: data.data.periodOwed || '',
          hasActiveCredit: !!data.data.hasActiveCredit
        });
      }
      return data.data;
    } catch (error: any) {
      if (!navigator.onLine || !error.response || error.code === 'ERR_NETWORK' || error.message === 'Offline') {
        const localId = uuidv4();
        const newLocalCustomer = {
          id: localId,
          name: customerData.name,
          phoneNumber: customerData.phone || '',
          nationalId: customerData.nationalId || '',
          email: '',
          address: customerData.address || '',
          notes: customerData.notes || '',
          balance: (customerData.amountOwed || 0).toString(),
          type: customerData.type || 'INDIVIDUAL',
          baseSalary: (customerData.baseSalary || 0).toString(),
          periodOwed: customerData.periodOwed || '',
          hasActiveCredit: Number(customerData.amountOwed || 0) > 0
        };
        await db.customers.put(newLocalCustomer);
        await queueManager.addToQueue('SALE', { localType: 'CUSTOMER_CREATE', ...customerData, localId }, localId).catch(() => {});
        return {
          id: localId,
          name: customerData.name,
          phone: customerData.phone,
          nationalId: customerData.nationalId,
          address: customerData.address,
          notes: customerData.notes,
          type: customerData.type || 'INDIVIDUAL',
          balance: Number(customerData.amountOwed || 0),
          baseSalary: customerData.baseSalary || 0,
          periodOwed: customerData.periodOwed,
          isActive: true,
          createdAt: new Date().toISOString()
        };
      }
      throw error;
    }
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
  },

  deleteCustomer: async (id: string) => {
    const { data } = await api.delete(`/customers/${id}`);
    return data;
  },

  clearAllCustomers: async () => {
    const { data } = await api.delete('/customers/clear-all');
    return data;
  }
};

export const useCustomers = (filters?: { page?: number; limit?: number; search?: string }) => {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customersApi.getCustomers(filters),
    staleTime: 15 * 60 * 1000, // 15 minutes
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

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useClearAllCustomers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.clearAllCustomers,
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
