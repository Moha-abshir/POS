import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  lastOnline?: string;
  lastOffline?: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    const isOnline = navigator.onLine;
    return {
      isOnline,
      lastOnline: isOnline ? new Date().toISOString() : undefined,
      lastOffline: !isOnline ? new Date().toISOString() : undefined
    };
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        isOnline: true,
        lastOnline: new Date().toISOString(),
        lastOffline: prev.lastOffline
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        isOnline: false,
        lastOnline: prev.lastOnline,
        lastOffline: new Date().toISOString()
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check in case it changed during mounting
    if (navigator.onLine !== status.isOnline) {
      if (navigator.onLine) {
        handleOnline();
      } else {
        handleOffline();
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status.isOnline]);

  return status;
}
