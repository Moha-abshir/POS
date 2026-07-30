import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface BankingCustomer {
  id: string;
  name: string;
  phone: string | null;
  type: 'BANKER' | 'LOAN_CLIENT';
  balance: string;
  createdAt: string;
}

export interface BankingTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'LOAN_ISSUED' | 'LOAN_REPAYMENT';
  amount: string;
  balanceAfter: string;
  notes: string | null;
  createdAt: string;
}

export interface BankingLedgerEntry {
  customer: BankingCustomer;
  transactions: BankingTransaction[];
}

export const bankingApi = {
  getCustomers: async (type?: 'BANKER' | 'LOAN_CLIENT') => {
    const { data } = await api.get('/banking/customers', { params: { type } });
    return data.data as BankingCustomer[];
  },

  createCustomer: async (customer: { name: string; phone?: string; type: 'BANKER' | 'LOAN_CLIENT' }) => {
    const { data } = await api.post('/banking/customers', customer);
    return data.data as BankingCustomer;
  },

  getLedger: async (id: string) => {
    const { data } = await api.get(`/banking/customers/${id}/ledger`);
    return data.data as BankingLedgerEntry;
  },

  processTransaction: async ({ id, data }: { id: string, data: { type: string, amount: number, notes?: string } }) => {
    const res = await api.post(`/banking/customers/${id}/transactions`, data);
    return res.data.data;
  },

  importCustomers: async (customers: any[]) => {
    const { data } = await api.post('/banking/customers/import', { customers });
    return data.data;
  }
};

export const useBankingCustomers = (type?: 'BANKER' | 'LOAN_CLIENT') => {
  return useQuery({
    queryKey: ['bankingCustomers', type],
    queryFn: () => bankingApi.getCustomers(type),
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

export const useBankingLedger = (id: string | null) => {
  return useQuery({
    queryKey: ['bankingLedger', id],
    queryFn: () => id ? bankingApi.getLedger(id) : null,
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

export const useImportBankingCustomers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bankingApi.importCustomers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankingCustomers'] });
    },
  });
};
