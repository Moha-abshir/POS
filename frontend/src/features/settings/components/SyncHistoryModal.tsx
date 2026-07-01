import React from 'react';
import { useSyncQueue, useSyncLogs, useSync } from '../../../core/offline/hooks/useOffline';
import { X, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface SyncHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncHistoryModal: React.FC<SyncHistoryModalProps> = ({ isOpen, onClose }) => {
  const { queue, loading: queueLoading } = useSyncQueue();
  const { logs, loading: logsLoading } = useSyncLogs();
  const { syncing, triggerSync, retryFailed, clearLogs } = useSync();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-[#1C1F24] border border-[#2D3139] text-gray-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2D3139]">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Synchronization Manager</h3>
            <p className="text-xs text-gray-400 mt-1">Monitor offline queues, retry attempts, and sync status logs</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-[#2D3139] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-[#25282F] border-b border-[#2D3139] flex gap-3 flex-wrap">
          <button
            onClick={triggerSync}
            disabled={syncing || !navigator.onLine}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All Pending'}
          </button>
          <button
            onClick={retryFailed}
            disabled={syncing || !navigator.onLine}
            className="px-4 py-2 bg-[#2D3139] hover:bg-[#3B404B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Failed Items
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 border border-red-900/50 text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log History
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:space-y-0">
          
          {/* Left: Pending Queue */}
          <div className="flex flex-col h-[400px]">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              Sync Queue
              <span className="px-2 py-0.5 bg-[#2D3139] text-gray-400 rounded-full text-2xs font-bold">
                {queue.length}
              </span>
            </h4>
            <div className="flex-1 bg-[#15171C] border border-[#2D3139] rounded-2xl overflow-y-auto p-4 space-y-3">
              {queueLoading ? (
                <p className="text-xs text-gray-500 text-center py-8">Loading queue items...</p>
              ) : queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500/70 mb-2" />
                  <p className="text-xs text-gray-400 font-medium">All records synchronized!</p>
                  <p className="text-2xs text-gray-500 mt-1">No transactions are waiting in the queue</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="p-3 bg-[#1C1F24] border border-[#2D3139] rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xs font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-950/40 border border-amber-900/50 text-amber-400 rounded">
                          {item.type}
                        </span>
                        <span className="text-2xs font-semibold text-gray-400 truncate max-w-[120px]">
                          {item.localId}
                        </span>
                      </div>
                      <p className="text-3xs text-gray-500 mt-1">Created: {new Date(item.createdAt).toLocaleTimeString()}</p>
                      {item.lastError && (
                        <p className="text-3xs text-red-400 mt-1 font-medium italic truncate max-w-[180px]">
                          Err: {item.lastError}
                        </p>
                      )}
                    </div>
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-full capitalize ${
                      item.status === 'syncing' ? 'bg-blue-950 text-blue-400' :
                      item.status === 'failed' ? 'bg-red-950 text-red-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: History Logs */}
          <div className="flex flex-col h-[400px]">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              Execution Logs
              <span className="px-2 py-0.5 bg-[#2D3139] text-gray-400 rounded-full text-2xs font-bold">
                {logs.length}
              </span>
            </h4>
            <div className="flex-1 bg-[#15171C] border border-[#2D3139] rounded-2xl overflow-y-auto p-4 space-y-3">
              {logsLoading ? (
                <p className="text-xs text-gray-500 text-center py-8">Loading logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8 font-medium">No logs recorded yet.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-[#1C1F24]/50 border border-[#2D3139]/40 rounded-xl flex gap-2">
                    <div className="mt-0.5">
                      {log.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> :
                       log.status === 'failed' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> :
                       <Info className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-3xs font-medium text-gray-300 leading-normal">{log.message}</p>
                      <span className="text-3xs text-gray-500 mt-0.5 block">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
export default SyncHistoryModal;
