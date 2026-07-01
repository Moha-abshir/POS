import { api } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IndexedDBCache } from '../../catalog/utils/indexedDb';

export interface Sale {
  id: string;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: 'CASH' | 'MPESA';
  mpesaRef?: string;
  soldAt: string;
  customerName?: string;
}

export interface SaleItemData {
  variantId: string;
  unitId: string;
  quantity: number;
  sellingPrice: number;
}

export interface SalesFilters {
  page?: number;
  limit?: number;
  customerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | '';
  paymentMethod?: 'CASH' | 'MPESA' | 'SPLIT' | 'CREDIT' | '';
  mpesaRef?: string;
}

export const salesApi = {
  getSales: async (filters?: SalesFilters) => {
    const { data } = await api.get('/sales', { params: filters });
    return data;
  },
  
  createSale: async (saleData: {
    customerId?: string;
    items: SaleItemData[];
    amountPaid: number;
    discountAmount?: number;
    paymentMethod: 'CASH' | 'MPESA' | 'SPLIT';
    mpesaRef?: string;
    mpesaPhoneNumber?: string;
    isStkPush?: boolean;
    splitDetails?: {
      cashAmount: number;
      mpesaAmount: number;
      mpesaRef?: string;
      mpesaPhoneNumber?: string;
      isStkPush?: boolean;
    };
  }) => {
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
      const { data } = await api.post('/sales', saleData);
      return data.data;
    } catch (error: any) {
      const isNetworkError = 
        !error.response || 
        error.code === 'ERR_NETWORK' || 
        error.message === 'Offline' || 
        error.message === 'Network Error';

      if (isNetworkError) {
        console.warn('Network/offline state detected. Queueing transaction in IndexedDB...', error);

        // 1. Queue the transaction in IndexedDB
        await IndexedDBCache.pushToQueue({
          ...saleData,
          soldAt: new Date().toISOString()
        });

        // 2. Perform client-side stock deduction in the cached catalog products
        const cached = await IndexedDBCache.get('catalog_products');
        if (cached && cached.products) {
          saleData.items.forEach(soldItem => {
            for (const product of cached.products) {
              const variant = product.variants?.find((v: any) => v.id === soldItem.variantId);
              if (variant) {
                const currentStock = Number(variant.baseStockQuantity) || 0;
                variant.baseStockQuantity = (currentStock - soldItem.quantity).toString();
                break;
              }
            }
          });
          await IndexedDBCache.set('catalog_products', {
            products: cached.products,
            timestamp: Date.now()
          });
        }

        // 3. Return mock success payload
        const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
        const discount = saleData.discountAmount || 0;
        const totalAmount = Math.max(0, subtotal - discount);

        return {
          id: `offline-${Date.now()}`,
          totalAmount,
          amountPaid: saleData.amountPaid,
          paymentStatus: saleData.amountPaid >= totalAmount ? 'PAID' : (saleData.amountPaid > 0 ? 'PARTIAL' : 'UNPAID'),
          paymentMethod: saleData.paymentMethod,
          mpesaRef: saleData.mpesaRef,
          soldAt: new Date().toISOString(),
          isOffline: true
        };
      }

      throw error;
    }
  },

  getSaleDetails: async (id: string) => {
    const { data } = await api.get(`/sales/${id}`);
    return data.data;
  },

  refundSale: async (id: string, refundData: { reason?: string; items: { variantId: string; unitId: string; quantity: number }[] }) => {
    const { data } = await api.post(`/sales/${id}/refund`, refundData);
    return data.data;
  }
};

export const useSales = (filters: SalesFilters = {}) => {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: () => salesApi.getSales(filters),
  });
};

export const useSaleDetails = (id: string | null) => {
  return useQuery({
    queryKey: ['sales', 'detail', id],
    queryFn: () => id ? salesApi.getSaleDetails(id) : null,
    enabled: !!id,
  });
};

export const useRefundSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, refundData }: { id: string; refundData: { reason?: string; items: { variantId: string; unitId: string; quantity: number }[] } }) => 
      salesApi.refundSale(id, refundData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });
};
