import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface Category {
  id: string;
  name: string;
}

export interface Unit {
  id?: string;
  name: string;
  sellingPrice: string | number;
  conversionFactor: string | number;
  isDefault: boolean;
}

export interface Variant {
  id: string;
  name: string;
  sku?: string;
  imageUrl?: string;
  costPrice: string | number;
  baseUnitName: string;
  baseStockQuantity: string | number;
  lowStockThreshold: string | number;
  isActive: boolean;
  units: Unit[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  categoryName?: string;
  description?: string;
  isActive: boolean;
  variants: Variant[];
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
  variants: {
    name: string;
    sku?: string;
    imageUrl?: string;
    costPrice: number;
    baseUnitName: string;
    initialStock: number;
    lowStockThreshold: number;
    units: {
      name: string;
      sellingPrice: number;
      conversionFactor: number;
      isDefault: boolean;
    }[];
  }[];
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

export interface CreateVariantUnitInput {
  name: string;
  sellingPrice: number;
  conversionFactor: number;
  isDefault?: boolean;
}

export const useCreateVariantUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, variantId, data }: { id: string; variantId: string; data: CreateVariantUnitInput }) => {
      const response = await api.post(`/catalog/products/${id}/variants/${variantId}/units`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export interface UpdateVariantUnitInput {
  name?: string;
  sellingPrice?: number;
  conversionFactor?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export const useUpdateVariantUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, variantId, unitId, data }: { id: string; variantId: string; unitId: string; data: UpdateVariantUnitInput }) => {
      const response = await api.patch(`/catalog/products/${id}/variants/${variantId}/units/${unitId}`, data);
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

export interface UpdateVariantInput {
  name?: string;
  sku?: string;
  imageUrl?: string;
  costPrice?: number;
  baseUnitName?: string;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export const useUpdateVariant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, variantId, data }: { id: string; variantId: string; data: UpdateVariantInput }) => {
      const response = await api.patch(`/catalog/products/${id}/variants/${variantId}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
