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

export interface CreateProductUnitInput {
  name: string;
  sellingPrice: number;
  conversionFactor?: number;
  isDefault?: boolean;
}

export const useCreateProductUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateProductUnitInput }) => {
      const response = await api.post(`/catalog/products/${id}/units`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export interface UpdateProductUnitInput {
  sellingPrice: number;
}

export const useUpdateProductUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, unitId, data }: { id: string; unitId: string; data: UpdateProductUnitInput }) => {
      const response = await api.patch(`/catalog/products/${id}/units/${unitId}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export interface UpdateProductInput {
  categoryId?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  costPrice?: number;
  baseStockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductInput }) => {
      const response = await api.patch(`/catalog/products/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
