import { api } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Expense {
  id: string;
  category: string;
  amount: number | string;
  description?: string;
  expenseDate: string;
  createdAt: string;
  createdBy: string;
}

export const expensesApi = {
  getExpenses: async (): Promise<Expense[]> => {
    const { data } = await api.get('/expenses');
    return data.data;
  },

  createExpense: async (expenseData: {
    category: string;
    amount: number;
    description?: string;
    expenseDate?: string;
  }): Promise<Expense> => {
    const { data } = await api.post('/expenses', expenseData);
    return data.data;
  },

  deleteExpense: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },
};

export const useExpenses = () => {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.getExpenses,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Also invalidate reports overview report if cached
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
