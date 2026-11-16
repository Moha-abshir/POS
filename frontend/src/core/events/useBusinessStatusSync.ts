import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../features/auth/stores/auth.store';
import { API_URL } from '../../lib/api';
import { subscribeToBusinessStatus } from './syncChannel';

export const useBusinessStatusSync = () => {
  const { isAuthenticated, accessToken, user, updateUser } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // 1. Cross-Window / Cross-Tab Sync via BroadcastChannel & Storage Event
  useEffect(() => {
    const unsubscribe = subscribeToBusinessStatus((event) => {
      const currentUser = useAuthStore.getState().user;
      if (
        currentUser &&
        currentUser.type !== 'admin' &&
        String(currentUser.businessId) === String(event.businessId)
      ) {
        updateUser({
          paymentStatus: event.paymentStatus,
          isPaymentLocked: event.isPaymentLocked,
          ...(event.businessStatus ? { businessStatus: event.businessStatus } : {}),
          paymentAmountDue: event.amountDue !== undefined ? event.amountDue : currentUser.paymentAmountDue,
          paymentLockReason: event.reason !== undefined ? event.reason : currentUser.paymentLockReason,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [updateUser]);

  // 2. Server-Sent Events (SSE) Real-Time Push Stream
  useEffect(() => {
    // Only connect for logged-in regular tenant users
    if (!isAuthenticated || !accessToken || !user?.businessId || user.type === 'admin') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    let isDisposed = false;

    const connectSSE = () => {
      if (isDisposed) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      try {
        const streamUrl = `${API_URL}/auth/status-stream?token=${encodeURIComponent(accessToken)}`;
        const es = new EventSource(streamUrl, { withCredentials: true });
        eventSourceRef.current = es;

        es.onmessage = (e) => {
          if (!e.data || isDisposed) return;
          try {
            const data = JSON.parse(e.data);
            if (
              data.type === 'PAYMENT_STATUS_UPDATE' &&
              String(data.businessId) === String(useAuthStore.getState().user?.businessId)
            ) {
              const currentUser = useAuthStore.getState().user;
              updateUser({
                paymentStatus: data.paymentStatus,
                isPaymentLocked: Boolean(data.isPaymentLocked),
                ...(data.businessStatus ? { businessStatus: data.businessStatus } : {}),
                paymentAmountDue: data.amountDue !== undefined ? data.amountDue : currentUser?.paymentAmountDue,
                paymentLockReason: data.reason !== undefined ? data.reason : currentUser?.paymentLockReason,
              });
            }
          } catch {
            // Keep-alive or non-JSON comments
          }
        };

        es.onerror = () => {
          if (es.readyState === EventSource.CLOSED) {
            es.close();
            eventSourceRef.current = null;
            if (!isDisposed) {
              // Reconnect after 5 seconds if connection was dropped
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
            }
          }
        };
      } catch (err) {
        console.error('SSE initialization error:', err);
      }
    };

    connectSSE();

    // Reconnect immediately if tab regains focus after background sleep
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED)
      ) {
        connectSSE();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      isDisposed = true;
      clearTimeout(reconnectTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, user?.businessId, user?.type, updateUser]);
};
