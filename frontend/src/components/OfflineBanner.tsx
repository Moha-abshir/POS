import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '../core/offline/networkMonitor';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);

  useEffect(() => {
    if (isOnline) {
      setShowOnlineStatus(true);
      const timer = setTimeout(() => {
        setShowOnlineStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowOnlineStatus(false);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="bg-red-600 text-white py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold animate-pulse shadow-md z-[9999] relative">
        <WifiOff className="w-4.5 h-4.5" />
        <span>Offline Mode — Sales are being stored locally. They will sync automatically.</span>
      </div>
    );
  }

  if (showOnlineStatus) {
    return (
      <div className="bg-green-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-500 shadow-md z-[9999] relative">
        <Wifi className="w-4.5 h-4.5" />
        <span>You are back online! All systems synchronized.</span>
      </div>
    );
  }

  return null;
};
export default OfflineBanner;
