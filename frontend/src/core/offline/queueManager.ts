import { db, type SyncQueueItem, type SyncLogItem } from './offlineDatabase';

export const queueManager = {
  /**
   * Pushes a new operation to the synchronization queue
   */
  addToQueue: async (
    type: SyncQueueItem['type'],
    payload: any,
    localId: string
  ): Promise<number> => {
    const queueId = await db.syncQueue.add({
      localId,
      type,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    });
    
    await queueManager.logSyncEvent(
      type,
      'info',
      `Queued offline ${type.toLowerCase()} record: ${localId}`
    );
    
    return queueId;
  },

  /**
   * Retrieves all items in the queue that require sync
   */
  getPendingQueue: async (): Promise<SyncQueueItem[]> => {
    return await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray();
  },

  /**
   * Updates an item's state in the queue
   */
  updateQueueStatus: async (
    id: number,
    status: SyncQueueItem['status'],
    lastError?: string
  ): Promise<void> => {
    const item = await db.syncQueue.get(id);
    if (!item) return;

    const updates: Partial<SyncQueueItem> = { status };
    if (lastError !== undefined) {
      updates.lastError = lastError;
      if (status === 'failed') {
        updates.retryCount = (item.retryCount || 0) + 1;
      }
    }

    await db.syncQueue.update(id, updates);
  },

  /**
   * Removes a completed item from the queue
   */
  removeCompleted: async (id: number): Promise<void> => {
    await db.syncQueue.delete(id);
  },

  /**
   * Adds an event to the sync history log
   */
  logSyncEvent: async (
    type: string,
    status: SyncLogItem['status'],
    message: string
  ): Promise<void> => {
    await db.syncLogs.add({
      timestamp: new Date().toISOString(),
      type,
      status,
      message
    });
  },

  /**
   * Gets sync execution history logs
   */
  getLogs: async (): Promise<SyncLogItem[]> => {
    return await db.syncLogs.orderBy('timestamp').reverse().toArray();
  },

  /**
   * Resets failed items in the queue to pending to force a manual retry
   */
  retryAllFailed: async (): Promise<void> => {
    await db.syncQueue
      .where('status')
      .equals('failed')
      .modify({ status: 'pending', retryCount: 0, lastError: undefined });

    await queueManager.logSyncEvent(
      'SYSTEM',
      'info',
      'Manually requested sync retry for all failed records'
    );
  },

  /**
   * Clears the sync execution history log
   */
  clearLogs: async (): Promise<void> => {
    await db.syncLogs.clear();
  }
};
