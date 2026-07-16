import { api } from '../../../lib/api';

export interface StockMovement {
  id: string;
  variantId: string;
  variantName: string;
  productName: string;
  type: 'PURCHASE' | 'SALE' | 'REFUND' | 'DAMAGE' | 'ADJUSTMENT';
  quantityChange: string;
  referenceType?: string;
  notes?: string;
  invoiceRef?: string;
  mpesaRef?: string;
  supplierName?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName?: string;
  totalAmount: string;
  amountPaid: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  invoiceRef?: string;
  mpesaRef?: string;
  purchasedAt: string;
}

export interface PurchaseItem {
  id: string;
  variantId: string;
  variantName: string;
  productName: string;
  unitId: string;
  unitName: string;
  quantity: string;
  costPrice: string;
  subtotal: string;
}

export interface PurchaseDetails extends Purchase {
  items: PurchaseItem[];
}

export const inventoryApi = {
  getMovements: async (filters?: { type?: string; startDate?: string; endDate?: string; product?: string; supplier?: string; invoiceRef?: string; mpesaRef?: string; paymentMethod?: string }) => {
    const res = await api.get('/inventory/movements', { params: filters });
    return res.data.data as StockMovement[];
  },

  adjustStock: async (data: { variantId: string; newQuantity: number; notes: string }) => {
    const res = await api.post('/inventory/adjust', data);
    return res.data;
  },

  recordDamage: async (data: { variantId: string; quantity: number; reason: string }) => {
    const res = await api.post('/inventory/damage', data);
    return res.data;
  },

  createPurchase: async (data: {
    supplierId: string;
    items: { variantId: string; quantity: number; costPrice: number }[];
    amountPaid: number;
    paymentMethod: 'CASH' | 'MPESA';
    invoiceRef?: string;
    mpesaRef?: string;
  }) => {
    const res = await api.post('/purchases', data);
    return res.data.data as Purchase;
  },

  getPurchases: async (filters?: { startDate?: string; endDate?: string; supplier?: string; invoiceRef?: string; mpesaRef?: string; paymentMethod?: string }) => {
    const res = await api.get('/purchases', { params: filters });
    return res.data.data as Purchase[];
  },

  getPurchaseDetails: async (purchaseId: string) => {
    const res = await api.get(`/purchases/${purchaseId}`);
    return res.data.data as PurchaseDetails;
  },

  getDamages: async () => {
    const res = await api.get('/inventory/damage');
    return res.data.data as DamageRecord[];
  }
};

export interface DamageRecord {
  id: string;
  variantId: string;
  variantName: string;
  productName: string;
  quantity: string;
  reason: string | null;
  damagedAt: string;
  createdBy: string;
}

import { useQuery } from '@tanstack/react-query';

export const useDamagesLog = () => {
  return useQuery({
    queryKey: ['damages'],
    queryFn: inventoryApi.getDamages,
  });
};
