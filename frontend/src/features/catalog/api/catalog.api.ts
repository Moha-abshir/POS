import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { IndexedDBCache } from '../utils/indexedDb';
import { db } from '../../../core/offline/offlineDatabase';

export interface Category {
  id: string;
  name: string;
}

export interface Unit {
  id?: string;
  name: string;
  sellingPrice: string | number;
  minimumPrice?: string | number;
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
  categoryId?: string;
  name: string;
  categoryName?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  variants: Variant[];
}

// --- QUERIES ---
export const useCategories = () => {
  const queryClient = useQueryClient();

  // Prime query cache from IndexedDB on startup
  useQuery({
    queryKey: ['categories-db-prime'],
    queryFn: async () => {
      const cached = await IndexedDBCache.get('catalog_categories');
      if (cached && cached.categories) {
        queryClient.setQueryData(['categories'], cached.categories);
      }
      return null;
    },
    staleTime: Infinity,
  });

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        if (!navigator.onLine) {
          throw new Error('Offline');
        }
        const response = await api.get<{ data: Category[] }>('/catalog/categories');
        const data = response.data.data;
        await IndexedDBCache.set('catalog_categories', { categories: data, timestamp: Date.now() });

        // Save to Dexie
        await db.categories.clear();
        await db.categories.bulkAdd(data.map(c => ({
          id: c.id,
          name: c.name
        })));

        return data;
      } catch (error) {
        const localCategories = await db.categories.toArray();
        if (localCategories.length > 0) {
          return localCategories;
        }
        const cached = await IndexedDBCache.get('catalog_categories');
        if (cached && cached.categories) {
          return cached.categories;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProducts = () => {
  const queryClient = useQueryClient();

  // Prime query cache from IndexedDB on startup
  useQuery({
    queryKey: ['products-db-prime'],
    queryFn: async () => {
      const cached = await IndexedDBCache.get('catalog_products');
      if (cached && cached.products) {
        queryClient.setQueryData(['products'], cached.products);
      }
      return null;
    },
    staleTime: Infinity,
  });

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        if (!navigator.onLine) {
          throw new Error('Offline');
        }
        const response = await api.get<{ data: Product[] }>('/catalog/products');
        const data = response.data.data;
        await IndexedDBCache.set('catalog_products', { products: data, timestamp: Date.now() });

        // Save to Dexie
        await db.products.clear();
        await db.variants.clear();
        await db.variantUnits.clear();

        for (const p of data) {
          await db.products.put({
            id: p.id,
            name: p.name,
            description: p.description,
            categoryId: p.categoryId,
            categoryName: p.categoryName,
            imageUrl: p.imageUrl,
            isActive: p.isActive
          });

          if (p.variants) {
            for (const v of p.variants) {
              await db.variants.put({
                id: v.id,
                productId: p.id,
                name: v.name,
                sku: v.sku,
                imageUrl: v.imageUrl,
                costPrice: v.costPrice,
                baseUnitName: v.baseUnitName,
                baseStockQuantity: v.baseStockQuantity,
                lowStockThreshold: v.lowStockThreshold,
                isActive: v.isActive ?? true
              });

              if (v.units) {
                for (const u of v.units) {
                  await db.variantUnits.put({
                    id: u.id,
                    variantId: v.id,
                    name: u.name,
                    sellingPrice: u.sellingPrice,
                    minimumPrice: u.minimumPrice,
                    conversionFactor: u.conversionFactor,
                    isDefault: u.isDefault
                  });
                }
              }
            }
          }
        }

        return data;
      } catch (error) {
        const localProducts = await db.products.toArray();
        if (localProducts.length > 0) {
          const formatted = [];
          for (const p of localProducts) {
            const variants = await db.variants.where('productId').equals(p.id).toArray();
            const formattedVariants = [];
            for (const v of variants) {
              const units = await db.variantUnits.where('variantId').equals(v.id).toArray();
              formattedVariants.push({ ...v, units });
            }
            formatted.push({ ...p, variants: formattedVariants });
          }
          return formatted;
        }

        const cached = await IndexedDBCache.get('catalog_products');
        if (cached && cached.products) {
          return cached.products;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
  categoryId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
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
    mutationFn: async (data: any) => {
      const response = await api.post('/catalog/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export interface CreateVariantInput {
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
}

export const useCreateVariant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, data }: { productId: string; data: CreateVariantInput }) => {
      const response = await api.post(`/catalog/products/${productId}/variants`, data);
      return response.data;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
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
  imageUrl?: string;
  isActive?: boolean;
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
