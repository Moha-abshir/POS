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
    id?: string;
    localId?: string;
    customerName?: string;
    customerBalanceAtSale?: number;
  }) => {
    const localId = saleData.id || saleData.localId || uuidv4();

    // Helper for executing instant local offline checkout in Dexie
    const executeOfflineSale = async () => {
      console.log('[Offline Sync] Executing instant local checkout sequence...');
      const cleanSaleData = JSON.parse(JSON.stringify(saleData));

      let customerBalanceAtSale = 0;
      let customerName = saleData.customerName || 'Walk-in Customer';

      if (saleData.customerId) {
        try {
          const customer = await db.customers.get(saleData.customerId);
          if (customer) {
            customerBalanceAtSale = Number(customer.balance) || 0;
            if (!saleData.customerName || saleData.customerName === 'Walk-in Customer') {
              customerName = customer.name;
            }
          }
        } catch (cErr) {
          console.warn('[Offline Sync] Error reading customer balance from Dexie:', cErr);
        }
      }

      const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
      const discount = saleData.discountAmount || 0;
      const totalAmount = Math.max(0, subtotal - discount);
      const creditAmount = Math.max(0, totalAmount - Number(saleData.amountPaid || 0));

      // 1. Queue the transaction in Dexie syncQueue
      await queueManager.addToQueue('SALE', {
        ...cleanSaleData,
        id: localId,
        localId,
        customerName,
        customerBalanceAtSale,
        soldAt: new Date().toISOString()
      }, localId);

      // 2. Client-side stock deduction in Dexie variants table
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

      // 3. Update customer balance locally if credit purchase
      if (saleData.customerId && creditAmount > 0) {
        try {
          const newBalance = customerBalanceAtSale + creditAmount;
          await db.customers.update(saleData.customerId, {
            balance: newBalance.toString(),
            hasActiveCredit: true
          });
          console.log(`[Offline Sync] Updated customer balance for ${customerName}. Old: ${customerBalanceAtSale}, New: ${newBalance}`);
        } catch (custErr) {
          console.warn('[Offline Sync] Customer balance update warning:', custErr);
        }
      }

      // Return mock response immediately for instant receipt generation
      return {
        id: localId,
        totalAmount,
        amountPaid: saleData.amountPaid,
        paymentStatus: saleData.amountPaid >= totalAmount ? 'PAID' : (saleData.amountPaid > 0 ? 'PARTIAL' : 'UNPAID'),
        paymentMethod: saleData.paymentMethod,
        mpesaRef: saleData.mpesaRef,
        soldAt: new Date().toISOString(),
        customerName,
        customerId: saleData.customerId,
        customerBalanceAtSale,
        isOffline: true,
        localId
      };
    };

    // If already offline, completely skip network and execute in < 10ms
    if (!navigator.onLine) {
      return await executeOfflineSale();
    }

    try {
      const { data } = await api.post('/sales', { ...saleData, id: localId, localId }, { timeout: 3500 });
      
      // Update local Dexie customer balance immediately on online sale success as well
      if (saleData.customerId) {
        const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
        const discount = saleData.discountAmount || 0;
        const totalAmount = Math.max(0, subtotal - discount);
        const creditAmount = Math.max(0, totalAmount - Number(saleData.amountPaid || 0));
        if (creditAmount > 0) {
          try {
            const cust = await db.customers.get(saleData.customerId);
            if (cust) {
              const curBal = Number(cust.balance) || 0;
              await db.customers.update(saleData.customerId, {
                balance: (curBal + creditAmount).toString(),
                hasActiveCredit: true
              });
            }
          } catch (cErr) {
            console.warn('[Local Sync] Failed to update local customer balance:', cErr);
          }
        }
      }

      return data.data;
    } catch (error: any) {
      const isNetworkError = 
        !navigator.onLine ||
        !error.response || 
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' || 
        error.message === 'Offline' || 
        error.message === 'Network Error' ||
        (error.response && [502, 503, 504].includes(error.response.status));

      if (isNetworkError) {
        console.warn('Network timeout / offline detected. Falling back to local offline sale...', error);
        return await executeOfflineSale();
      }

      throw error;
    }
  },

  getSaleDetails: async (id: string) => {
    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }
      const { data } = await api.get(`/sales/${id}`, { timeout: 3000 });
      return data.data;
    } catch (error: any) {
      const queuedItem = await db.syncQueue.where('localId').equals(id).first();
      if (queuedItem && queuedItem.payload) {
        const p = queuedItem.payload;
        const subtotal = p.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.sellingPrice), 0) || 0;
        const discount = p.discountAmount || 0;
        const total = Math.max(0, subtotal - discount);

        let customerName = p.customerName || 'Walk-in Customer';
        let customerBalanceAtSale = p.customerBalanceAtSale || 0;
        if (p.customerId) {
          try {
            const cust = await db.customers.get(p.customerId);
            if (cust) {
              customerName = cust.name;
              if (p.customerBalanceAtSale === undefined) {
                customerBalanceAtSale = Number(cust.balance) || 0;
              }
            }
          } catch (e) {}
        }

        return {
          id: p.localId || p.id || id,
          totalAmount: total,
          amountPaid: p.amountPaid || 0,
          paymentStatus: (p.amountPaid || 0) >= total ? 'PAID' : ((p.amountPaid || 0) > 0 ? 'PARTIAL' : 'UNPAID'),
          paymentMethod: p.paymentMethod || 'CASH',
          soldAt: p.soldAt || new Date().toISOString(),
          customerName,
          customerId: p.customerId,
          customerBalanceAtSale,
          items: p.items?.map((item: any) => ({
            id: item.variantId,
            variantId: item.variantId,
            unitId: item.unitId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            totalPrice: item.quantity * item.sellingPrice,
            productName: item.productName || 'Item',
            variantName: item.variantName || 'Default',
            unitName: item.unitName || 'Piece'
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
