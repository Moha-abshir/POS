import { queueManager } from './queueManager';
import { salesApi } from '../../features/sales/api/sales.api';
import { customersApi } from '../../features/customers/api/customers.api';

let syncInProgress = false;
const retryTimers: Record<number, any> = {};

const BACKOFF_SCHEDULE = [5000, 10000, 30000, 60000, 300000]; // 5s, 10s, 30s, 60s, 5m

export const syncService = {
  isSyncing: () => syncInProgress,

  startSync: async (queryClient?: any): Promise<void> => {
    if (syncInProgress) return;
    if (!navigator.onLine) return;

    syncInProgress = true;
    await queueManager.logSyncEvent('SYSTEM', 'info', 'Synchronization process started');

    try {
      const pendingItems = await queueManager.getPendingQueue();
      if (pendingItems.length === 0) {
        syncInProgress = false;
        return;
      }

      const typeOrder: Record<string, number> = {
        SALE: 1,
        PAYMENT: 2,
        REFUND: 3,
        INVENTORY_ADJUSTMENT: 4
      };

      const sortedItems = [...pendingItems].sort((a, b) => {
        const orderA = typeOrder[a.type] || 99;
        const orderB = typeOrder[b.type] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      for (const item of sortedItems) {
        if (!navigator.onLine) break;
        if (item.id && retryTimers[item.id]) continue;

        await queueManager.updateQueueStatus(item.id!, 'syncing');

        try {
          if (item.type === 'SALE') {
            const { isOffline, ...cleanPayload } = item.payload;
            const saleIdToSync = item.localId || item.payload?.id || item.payload?.localId;
            const response = await salesApi.createSale({
              ...cleanPayload,
              id: saleIdToSync,
              localId: saleIdToSync
            });
            
            await queueManager.removeCompleted(item.id!);
            await queueManager.logSyncEvent(
              'SALE',
              'success',
              `Synced sale ${item.localId} successfully. Server ID: ${response.id || response}`
            );
          } else {
            await queueManager.removeCompleted(item.id!);
            await queueManager.logSyncEvent(
              item.type,
              'success',
              `Synced ${item.type.toLowerCase()} successfully: ${item.localId}`
            );
          }
        } catch (error: any) {
          console.error(`Sync error for item ${item.id}:`, error);
          const errorMessage = error?.response?.data?.message || error?.message || 'Unknown network error';
          
          const nextRetryCount = (item.retryCount || 0) + 1;
          
          if (nextRetryCount >= 10) {
            await queueManager.updateQueueStatus(item.id!, 'failed', `Max retries exceeded: ${errorMessage}`);
            await queueManager.logSyncEvent(
              item.type,
              'failed',
              `Item ${item.localId} failed permanently. Max retries exceeded.`
            );
          } else {
            await queueManager.updateQueueStatus(item.id!, 'failed', errorMessage);
            await queueManager.logSyncEvent(
              item.type,
              'failed',
              `Item ${item.localId} failed. Retry count: ${nextRetryCount}/10. Error: ${errorMessage}`
            );

            const backoffIndex = Math.min(nextRetryCount - 1, BACKOFF_SCHEDULE.length - 1);
            const delay = BACKOFF_SCHEDULE[backoffIndex];
            
            retryTimers[item.id!] = setTimeout(() => {
              delete retryTimers[item.id!];
              syncService.startSync(queryClient);
            }, delay);
          }
        }
      }

      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }
      customersApi.syncCustomerCache().catch(() => {});
    } catch (err: any) {
      console.error('Failed sync cycle:', err);
    } finally {
      syncInProgress = false;
    }
  }
};
export default syncService;
