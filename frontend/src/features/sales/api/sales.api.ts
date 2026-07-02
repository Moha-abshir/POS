import { api } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../core/offline/offlineDatabase';
import { queueManager } from '../../../core/offline/queueManager';
import { IndexedDBCache } from '../../catalog/utils/indexedDb';
import { v4 as uuidv4 } from 'uuid';

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
        console.warn('Network/offline state detected. Queueing transaction in Dexie...', error);

        const localId = uuidv4();

        try {
          console.log('[Offline Sync] Starting offline checkout sequence...');
          // Remove undefined values to prevent DataCloneError in IndexedDB
          const cleanSaleData = JSON.parse(JSON.stringify(saleData));

          // 1. Queue the transaction in Dexie syncQueue
          console.log('[Offline Sync] Writing checkout details to Dexie queue...');
          await queueManager.addToQueue('SALE', {
            ...cleanSaleData,
            localId,
            soldAt: new Date().toISOString()
          }, localId);
          console.log('[Offline Sync] Successfully wrote to Dexie queue');

          // 2. Perform client-side stock deduction in Dexie variants table
          console.log('[Offline Sync] Executing client-side stock deductions on variants table...');
          for (const item of saleData.items) {
            console.log(`[Offline Sync] Reading variant details for ID: ${item.variantId}`);
            const variant = await db.variants.get(item.variantId);
            if (variant) {
              const currentStock = Number(variant.baseStockQuantity) || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              console.log(`[Offline Sync] Deducting stock for variant: ${variant.name} (SKU: ${variant.sku}). Old stock: ${currentStock}, New stock: ${newStock}`);
              await db.variants.update(item.variantId, {
                baseStockQuantity: newStock.toString()
              });
            } else {
              console.log(`[Offline Sync] Variant ID ${item.variantId} not found in local Dexie store. Skipping stock deduction.`);
            }
          }
          console.log('[Offline Sync] Deducted local variant stocks successfully');

          // Also update legacy catalog_products for compatibility
          console.log('[Offline Sync] Querying legacy catalog_products IndexedDB cache...');
          const cached = await IndexedDBCache.get('catalog_products');
          if (cached && cached.products) {
            console.log('[Offline Sync] Updating legacy catalog cache quantities...');
            saleData.items.forEach(soldItem => {
              for (const product of cached.products) {
                const variant = product.variants?.find((v: any) => v.id === soldItem.variantId);
                if (variant) {
                  const currentStock = Number(variant.baseStockQuantity) || 0;
                  variant.baseStockQuantity = Math.max(0, currentStock - soldItem.quantity).toString();
                  break;
                }
              }
            });
            console.log('[Offline Sync] Saving updated legacy catalog cache...');
            await IndexedDBCache.set('catalog_products', {
              products: cached.products,
              timestamp: Date.now()
            });
            console.log('[Offline Sync] Saved legacy catalog cache successfully');
          } else {
            console.log('[Offline Sync] Legacy catalog cache is empty or unavailable');
          }
        } catch (writeError) {
          console.error('[Offline Sync] CRITICAL ERROR writing offline sale transaction to Dexie/IndexedDB:', writeError);
          throw writeError;
        }

        console.log('[Offline Sync] Completed offline checkout sequence. Returning mock response.');

        // 3. Return mock success payload
        const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
        const discount = saleData.discountAmount || 0;
        const totalAmount = Math.max(0, subtotal - discount);

        return {
          id: localId,
          totalAmount,
          amountPaid: saleData.amountPaid,
          paymentStatus: saleData.amountPaid >= totalAmount ? 'PAID' : (saleData.amountPaid > 0 ? 'PARTIAL' : 'UNPAID'),
          paymentMethod: saleData.paymentMethod,
          mpesaRef: saleData.mpesaRef,
          soldAt: new Date().toISOString(),
          isOffline: true,
          localId
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
