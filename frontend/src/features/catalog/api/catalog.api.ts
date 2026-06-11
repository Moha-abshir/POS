import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  categoryName?: string;
  description?: string;
  imageUrl?: string;
  costPrice: string;
  baseStockQuantity: string;
  lowStockThreshold: string;
  isActive: boolean;
}

// --- QUERIES ---
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<{ data: Category[] }>('/catalog/categories');
      return response.data.data;
    },
  });
};

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<{ data: Product[] }>('/catalog/products');
      return response.data.data;
    },
  });
};

// --- MUTATIONS ---
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/catalog/categories', { name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export interface CreateProductInput {
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  costPrice: number;
  baseStockQuantity?: number;
  lowStockThreshold?: number;
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const response = await api.post('/catalog/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
