import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface BankingCustomer {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  idNumber: string | null;
  balance: string;
  createdAt: string;
}

export interface BankingTransaction {
  id: string;
  transNo: number | null;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: string;
  depositAmount: string;
  withdrawAmount: string;
  balanceAfter: string;
  notes: string | null;
  createdAt: string;
}

export interface BankingCustomersResponse {
  customers: BankingCustomer[];
  totalBalance: string;
}

export interface BankingLedgerEntry {
  customer: BankingCustomer;
  transactions: BankingTransaction[];
}

export const bankingApi = {
  getCustomers: async () => {
    const { data } = await api.get('/banking/customers');
    return data.data as BankingCustomersResponse;
  },

  createCustomer: async (customer: { code?: string; name: string; phone?: string; idNumber?: string }) => {
    const { data } = await api.post('/banking/customers', customer);
    return data.data as BankingCustomer;
  },

  updateCustomer: async ({ id, data }: { id: string; data: { code?: string; name: string; phone?: string; idNumber?: string } }) => {
    const res = await api.put(`/banking/customers/${id}`, data);
    return res.data.data as BankingCustomer;
  },

  deleteCustomer: async (id: string) => {
    const res = await api.delete(`/banking/customers/${id}`);
    return res.data.data;
  },

  getLedger: async (id: string) => {
    const { data } = await api.get(`/banking/customers/${id}/ledger`);
    return data.data as BankingLedgerEntry;
  },

  processTransaction: async ({ id, data }: { id: string; data: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; notes?: string } }) => {
    const res = await api.post(`/banking/customers/${id}/transactions`, data);
    return res.data.data;
  },

  importCustomers: async (csvText: string) => {
    const { data } = await api.post('/banking/customers/import', { csvText });
    return data.data;
  }
};

export const useBankingCustomers = () => {
  return useQuery({
    queryKey: ['bankingCustomers'],
    queryFn: () => bankingApi.getCustomers(),
  });
};

export const useCreateBankingCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bankingApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankingCustomers'] });
    },
  });
};

export const useUpdateBankingCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bankingApi.updateCustomer,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bankingCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['bankingLedger', variables.id] });
    },
  });
};

export const useDeleteBankingCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bankingApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankingCustomers'] });
    },
  });
};

export const useBankingLedger = (id: string | null) => {
  return useQuery({
    queryKey: ['bankingLedger', id],
    queryFn: () => (id ? bankingApi.getLedger(id) : null),
    enabled: !!id,
  });
};

export const useProcessBankingTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bankingApi.processTransaction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bankingLedger', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bankingCustomers'] });
    },
  });
};
