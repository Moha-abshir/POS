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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div className="bg-gradient-to-b from-[#1E232B] to-[#14161A] border border-white/10 text-gray-200 rounded-[32px] w-full max-w-4xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
        
        {/* Header - Premium Glass Look */}
        <div className="flex items-center justify-between p-6 sm:px-8 sm:py-7 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <RefreshCw className={`w-6 h-6 text-white ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Synchronization Center</h3>
              <p className="text-sm text-gray-400 mt-0.5">Manage offline queues and live sync status</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-4 sm:px-8 bg-black/20 border-b border-white/5 flex gap-3 flex-wrap items-center">
          <button
            onClick={triggerSync}
            disabled={syncing || !navigator.onLine}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Now...' : 'Sync Pending Items'}
          </button>
          <button
            onClick={retryFailed}
            disabled={syncing || !navigator.onLine}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Retry Failed
          </button>
          <button
            onClick={clearLogs}
            className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center gap-2 ml-auto transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 bg-black/10">
          
          {/* Left: Pending Queue */}
          <div className="flex flex-col h-[450px]">
            <div className="flex justify-between items-end mb-4 px-1">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                Pending Queue
              </h4>
              <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-bold border border-white/5 shadow-inner">
                {queue.length} items
              </span>
            </div>
            <div className="flex-1 bg-[#1A1D24] border border-white/5 rounded-3xl overflow-y-auto p-5 space-y-3 shadow-inner">
              {queueLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                   <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                   <p className="text-sm font-medium">Loading queue...</p>
                </div>
              ) : queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gradient-to-b from-green-500/5 to-transparent rounded-2xl border border-green-500/10">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-sm font-bold text-white">All Caught Up!</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px]">There are no pending transactions waiting to be synchronized.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl flex items-center justify-between gap-4 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
                          {item.type}
                        </span>
                        <span className="text-xs font-bold text-gray-300 truncate">
                          {item.localId}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </p>
                      {item.lastError && (
                        <p className="text-xs text-red-400 mt-2 font-medium bg-red-500/10 p-2 rounded-lg border border-red-500/10 break-words">
                          {item.lastError}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {item.status === 'syncing' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400" title="Syncing">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        </div>
                      ) : item.status === 'failed' ? (
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400" title="Failed">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-400" title="Pending">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: History Logs */}
          <div className="flex flex-col h-[450px]">
            <div className="flex justify-between items-end mb-4 px-1">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                Execution Logs
              </h4>
              <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-bold border border-white/5 shadow-inner">
                {logs.length} logs
              </span>
            </div>
            <div className="flex-1 bg-[#1A1D24] border border-white/5 rounded-3xl overflow-y-auto p-5 space-y-3 shadow-inner relative">
              {/* Timeline line */}
              {logs.length > 0 && !logsLoading && (
                <div className="absolute left-8 top-8 bottom-8 w-px bg-white/5 z-0"></div>
              )}

              {logsLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                   <div className="w-8 h-8 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin"></div>
                   <p className="text-sm font-medium">Loading logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <Info className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">No logs available</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="relative z-10 flex gap-4">
                    <div className="shrink-0 mt-1">
                      {log.status === 'success' ? (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 border-2 border-[#1A1D24] flex items-center justify-center ring-1 ring-green-500/50">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        </div>
                      ) : log.status === 'failed' ? (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 border-2 border-[#1A1D24] flex items-center justify-center ring-1 ring-red-500/50">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-[#1A1D24] flex items-center justify-center ring-1 ring-blue-500/50">
                          <Info className="w-3 h-3 text-blue-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 pb-4">
                      <p className="text-xs font-semibold text-gray-200 leading-relaxed">{log.message}</p>
                      <span className="text-[10px] font-bold text-gray-500 mt-2 block uppercase tracking-wider">
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
