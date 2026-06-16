import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RestockItem {
  id: string;
  variantId: string;
  variantName: string;
  productName: string;
  isOrdered: boolean;
  createdAt: string;
}

export const useRestockList = () => {
  return useQuery({
    queryKey: ['restock-list'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RestockItem[] }>('/inventory/restock-list');
      return data.data;
    },
  });
};

export const useAddToRestockList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string) => {
      const { data } = await api.post<{ data: RestockItem }>('/inventory/restock-list', { variantId });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restock-list'] });
    },
  });
};

export const useUpdateRestockItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isOrdered }: { id: string; isOrdered: boolean }) => {
      const { data } = await api.patch<{ data: RestockItem }>(`/inventory/restock-list/${id}`, { isOrdered });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restock-list'] });
    },
  });
};

export const useClearOrderedItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/inventory/restock-list/clear');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restock-list'] });
    },
  });
};
