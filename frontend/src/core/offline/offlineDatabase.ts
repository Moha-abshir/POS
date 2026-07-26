import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface LocalCategory {
  id: string;
  name: string;
  description?: string;
}

export interface LocalVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  imageUrl?: string;
  costPrice: string;
  baseUnitName: string;
  baseStockQuantity: string;
  lowStockThreshold: string;
  isActive: boolean;
}

export interface LocalUnit {
  id: string;
  variantId: string;
  name: string;
  sellingPrice: string;
  conversionFactor: string;
  isDefault: boolean;
}

export interface LocalCustomer {
  id: string;
  name: string;
  phoneNumber?: string;
  nationalId?: string;
  email?: string;
  address?: string;
  notes?: string;
  balance: string;
  type?: 'INDIVIDUAL' | 'BUSINESS' | 'EMPLOYEE';
  baseSalary?: string;
  periodOwed?: string;
  hasActiveCredit?: boolean;
}

export interface SyncQueueItem {
  id?: number;
  localId: string; // client-generated UUID
  type: 'SALE' | 'PAYMENT' | 'REFUND' | 'INVENTORY_ADJUSTMENT';
  payload: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface SyncLogItem {
  id?: number;
  timestamp: string;
  type: string;
  status: 'success' | 'failed' | 'info';
  message: string;
}

export interface LocalSetting {
  key: string;
  value: any;
}

export class OfflineDatabase extends Dexie {
  products!: Table<LocalProduct>;
  categories!: Table<LocalCategory>;
  variants!: Table<LocalVariant>;
  variantUnits!: Table<LocalUnit>;
  customers!: Table<LocalCustomer>;
  syncQueue!: Table<SyncQueueItem>;
  syncLogs!: Table<SyncLogItem>;
  settings!: Table<LocalSetting>;

  constructor() {
    super('pos-offline-dexie');
    this.version(1).stores({
      products: 'id, name, categoryId, isActive',
      categories: 'id, name',
      variants: 'id, productId, name, sku',
      variantUnits: 'id, variantId, name',
      customers: 'id, name, phoneNumber, type',
      syncQueue: '++id, localId, type, status, createdAt',
      syncLogs: '++id, timestamp, status',
      settings: 'key'
    });
  }
}

export const db = new OfflineDatabase();
