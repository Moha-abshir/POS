import { api } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';

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
  startDate?: string;
  endDate?: string;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | '';
  paymentMethod?: 'CASH' | 'MPESA' | '';
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
    paymentMethod: 'CASH' | 'MPESA';
    mpesaRef?: string;
    mpesaPhoneNumber?: string;
    isStkPush?: boolean;
  }) => {
    const { data } = await api.post('/sales', saleData);
    return data.data;
  },

  getSaleDetails: async (id: string) => {
    const { data } = await api.get(`/sales/${id}`);
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
