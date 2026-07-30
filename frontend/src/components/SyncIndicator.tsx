import React, { useState } from 'react';
import { usePendingSalesCount, useSync } from '../core/offline/hooks/useOffline';
import { SyncHistoryModal } from '../features/settings/components/SyncHistoryModal';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncIndicatorProps {
  variant?: 'pill' | 'button';
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ variant = 'pill' }) => {
  const pendingCount = usePendingSalesCount();
  const { syncing } = useSync();
  const [modalOpen, setModalOpen] = useState(false);

  if (variant === 'button') {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            pendingCount > 0 ? 'text-amber-500 animate-pulse' : 'text-gray-400 hover:text-white'
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin text-amber-500' : (pendingCount > 0 ? 'text-amber-500' : 'text-gray-400')}`} />
          <span>{syncing ? 'Syncing' : (pendingCount > 0 ? 'Pending' : 'Synced')}</span>
        </button>

        <SyncHistoryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white font-semibold rounded-[var(--radius-md)] cursor-pointer select-none text-xs"
      >
        {syncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
            <span className="text-white">Syncing...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="text-white">{pendingCount} sale{pendingCount > 1 ? 's' : ''} waiting</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-white font-medium">All Synced</span>
          </>
        )}
      </button>

      <SyncHistoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
export default SyncIndicator;
