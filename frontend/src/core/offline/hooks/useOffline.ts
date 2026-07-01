import { useState, useEffect } from 'react';
import { db, type SyncQueueItem, type SyncLogItem } from '../offlineDatabase';
import { syncService } from '../syncService';
import { queueManager } from '../queueManager';
import { useQueryClient } from '@tanstack/react-query';

export function usePendingSalesCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const c = await db.syncQueue.where('status').anyOf(['pending', 'failed']).count();
        if (active) setCount(c);
      } catch (err) {
        console.error('Failed to query offline queue count:', err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}

export function useSyncQueue(): { queue: SyncQueueItem[]; loading: boolean; refetch: () => void } {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const list = await db.syncQueue.toArray();
      setQueue(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  return { queue, loading, refetch: fetchQueue };
}

export function useSyncLogs(): { logs: SyncLogItem[]; loading: boolean; refetch: () => void } {
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const list = await queueManager.getLogs();
      setLogs(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  return { logs, loading, refetch: fetchLogs };
}

export function useSync() {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const triggerSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncService.startSync(queryClient);
    } catch (err) {
      console.error('Manual sync execution failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const retryFailed = async () => {
    await queueManager.retryAllFailed();
    triggerSync();
  };

  const clearLogs = async () => {
    await queueManager.clearLogs();
  };

  return {
    syncing: syncing || syncService.isSyncing(),
    triggerSync,
    retryFailed,
    clearLogs
  };
}
