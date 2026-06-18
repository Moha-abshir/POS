import { api } from '../../../lib/api';

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

export const salesApi = {
  getSales: async (filters?: { page?: number; limit?: number; customerId?: string }) => {
    const { data } = await api.get('/sales', { params: filters });
    return data;
  },
  
  createSale: async (saleData: {
    customerId?: string;
    items: SaleItemData[];
    amountPaid: number;
    discountAmount?: number;
    paymentMethod: 'CASH' | 'MPESA';
    mpesaRef?: string;
    mpesaPhoneNumber?: string;
  }) => {
    const { data } = await api.post('/sales', saleData);
    return data.data;
  }
};
