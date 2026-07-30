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
  customerBalance?: number | string;
  customerBalanceAtSale?: number | string;
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
        !navigator.onLine ||
        !error.response || 
        error.code === 'ERR_NETWORK' || 
        error.message === 'Offline' || 
        error.message === 'Network Error' ||
        (error.response && [502, 503, 504].includes(error.response.status));

      if (isNetworkError) {
        console.warn('Network/offline state detected. Queueing transaction in Dexie...', error);

        const localId = uuidv4();

        try {
          console.log('[Offline Sync] Starting offline checkout sequence...');
          // Remove undefined values to prevent DataCloneError in IndexedDB
          const cleanSaleData = JSON.parse(JSON.stringify(saleData));

          let customerBalanceAtSale = 0;
          if (saleData.customerId) {
            const customer = await db.customers.get(saleData.customerId);
            if (customer) {
              customerBalanceAtSale = Number(customer.balance) || 0;
            }
          }

          // 1. Queue the transaction in Dexie syncQueue
          console.log('[Offline Sync] Writing checkout details to Dexie queue...');
          await queueManager.addToQueue('SALE', {
            ...cleanSaleData,
            customerBalanceAtSale,
            localId,
            soldAt: new Date().toISOString()
          }, localId);
          console.log('[Offline Sync] Successfully wrote to Dexie queue');

          // 2. Perform client-side stock deduction in Dexie variants table
          console.log('[Offline Sync] Executing client-side stock deductions on variants table...');
          if (saleData.items && Array.isArray(saleData.items)) {
            for (const item of saleData.items) {
              try {
                const variant = await db.variants.get(item.variantId);
                if (variant) {
                  const currentStock = Number(variant.baseStockQuantity) || 0;
                  const newStock = Math.max(0, currentStock - item.quantity);
                  await db.variants.update(item.variantId, {
                    baseStockQuantity: newStock.toString()
                  });
                }
              } catch (varErr) {
                console.warn('[Offline Sync] Variant stock update warning:', varErr);
              }
            }
          }

          // Update customer balance locally if customerId and credit purchase
          if (saleData.customerId) {
            try {
              const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
              const discount = saleData.discountAmount || 0;
              const totalAmt = Math.max(0, subtotal - discount);
              const creditAmount = Math.max(0, totalAmt - Number(saleData.amountPaid || 0));

              if (creditAmount > 0) {
                const customer = await db.customers.get(saleData.customerId);
                if (customer) {
                  const currentBalance = Number(customer.balance) || 0;
                  const newBalance = currentBalance + creditAmount;
                  await db.customers.update(saleData.customerId, {
                    balance: newBalance.toString(),
                    hasActiveCredit: true
                  });
                  console.log(`[Offline Sync] Updated customer balance for ${customer.name}. New balance: KSh ${newBalance}`);
                }
              }
            } catch (custErr) {
              console.warn('[Offline Sync] Customer balance update warning:', custErr);
            }
          }

          // Also update legacy catalog_products for compatibility
          try {
            const cached = await IndexedDBCache.get('catalog_products');
            if (cached && cached.products) {
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
              await IndexedDBCache.set('catalog_products', {
                products: cached.products,
                timestamp: Date.now()
              });
            }
          } catch (cacheErr) {
            console.warn('[Offline Sync] Legacy catalog cache update warning:', cacheErr);
          }
        } catch (writeError) {
          console.error('[Offline Sync] Error writing offline sale transaction to Dexie:', writeError);
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
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
      const { data } = await api.get(`/sales/${id}`);
      return data.data;
    } catch (error: any) {
      const queuedItem = await db.syncQueue.where('localId').equals(id).first();
      if (queuedItem && queuedItem.payload) {
        const p = queuedItem.payload;
        const subtotal = p.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.sellingPrice), 0) || 0;
        const discount = p.discountAmount || 0;
        const total = Math.max(0, subtotal - discount);
        return {
          id: p.localId || id,
          totalAmount: total,
          amountPaid: p.amountPaid || 0,
          paymentStatus: (p.amountPaid || 0) >= total ? 'PAID' : ((p.amountPaid || 0) > 0 ? 'PARTIAL' : 'UNPAID'),
          paymentMethod: p.paymentMethod || 'CASH',
          soldAt: p.soldAt || new Date().toISOString(),
          customerName: 'Offline Customer',
          customerId: p.customerId,
          customerBalanceAtSale: p.customerBalanceAtSale,
          items: p.items?.map((item: any) => ({
            id: item.variantId,
            variantId: item.variantId,
            unitId: item.unitId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            totalPrice: item.quantity * item.sellingPrice,
            productName: item.productName || 'Item',
            variantName: item.variantName || 'Default',
            unitName: item.unitName || 'Pcs'
          })) || [],
          isOffline: true
        };
      }
      throw error;
    }
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
