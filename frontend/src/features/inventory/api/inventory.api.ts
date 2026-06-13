import { api } from '../../../lib/api';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'PURCHASE' | 'SALE' | 'REFUND' | 'DAMAGE' | 'ADJUSTMENT';
  quantityChange: string;
  referenceType?: string;
  notes?: string;
  invoiceRef?: string;
  mpesaRef?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  totalAmount: string;
  amountPaid: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  invoiceRef?: string;
  mpesaRef?: string;
  purchasedAt: string;
}

export const inventoryApi = {
  getMovements: async () => {
    const res = await api.get('/inventory/movements');
    return res.data.data as StockMovement[];
  },

  adjustStock: async (data: { productId: string; newQuantity: number; notes: string }) => {
    const res = await api.post('/inventory/adjust', data);
    return res.data;
  },

  recordDamage: async (data: { productId: string; quantity: number; reason: string }) => {
    const res = await api.post('/inventory/damage', data);
    return res.data;
  },

  createPurchase: async (data: {
    supplierId: string;
    items: { productId: string; quantity: number; costPrice: number }[];
    amountPaid: number;
    paymentMethod: 'CASH' | 'MPESA';
    invoiceRef?: string;
    mpesaRef?: string;
  }) => {
    const res = await api.post('/purchases', data);
    return res.data.data as Purchase;
  },

  getPurchases: async () => {
    const res = await api.get('/purchases');
    return res.data.data as Purchase[];
  }
};
