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

  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      <div className={`relative bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[32px] w-full max-w-4xl overflow-hidden shadow-[var(--shadow-modal)] flex flex-col max-h-[90vh] transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-[0.97]'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:px-8 sm:py-6 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-md">
              <RefreshCw className={`w-6 h-6 text-white ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Synchronization Center</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Manage offline queues and live sync status</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-bg-sunken)] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-4 sm:px-8 bg-[var(--color-bg-surface)] border-b border-[var(--color-border)] flex gap-3 flex-wrap items-center">
          <button
            onClick={triggerSync}
            disabled={syncing || !navigator.onLine}
            className="px-5 py-2.5 bg-black hover:bg-black text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Now...' : 'Sync Pending Items'}
          </button>
          <button
            onClick={retryFailed}
            disabled={syncing || !navigator.onLine}
            className="px-5 py-2.5 bg-white hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-[var(--color-accent)]" />
            Retry Failed
          </button>
          <button
            onClick={clearLogs}
            className="px-5 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 ml-auto transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 bg-[var(--color-bg-base)]">
          
          {/* Left: Pending Queue */}
          <div className="flex flex-col h-[450px]">
            <div className="flex justify-between items-end mb-4 px-1">
              <h4 className="text-sm font-extrabold text-[var(--color-text-primary)] uppercase tracking-widest flex items-center gap-2">
                Pending Queue
              </h4>
              <span className="px-3 py-1 bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)] rounded-full text-xs font-bold border border-[var(--color-border)] shadow-sm">
                {queue.length} items
              </span>
            </div>
            <div className="flex-1 bg-white border border-[var(--color-border)] rounded-3xl overflow-y-auto p-5 space-y-3 shadow-sm">
              {queueLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] gap-3">
                   <div className="w-8 h-8 border-2 border-[var(--color-accent-subtle)] border-t-[var(--color-accent)] rounded-full animate-spin"></div>
                   <p className="text-sm font-medium">Loading queue...</p>
                </div>
              ) : queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-green-50/50 rounded-2xl border border-green-100">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">All Caught Up!</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-[200px]">There are no pending transactions waiting to be synchronized.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="p-4 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-2xl flex items-center justify-between gap-4 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-[var(--color-accent-subtle)] text-[var(--color-accent-hover)] rounded-md border border-[var(--color-accent)]/20">
                          {item.type}
                        </span>
                        <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                          {item.localId}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </p>
                      {item.lastError && (
                        <p className="text-xs text-red-600 mt-2 font-medium bg-red-50 p-2 rounded-lg border border-red-100 break-words">
                          {item.lastError}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {item.status === 'syncing' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600" title="Syncing">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        </div>
                      ) : item.status === 'failed' ? (
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600" title="Failed">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500" title="Pending">
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
              <h4 className="text-sm font-extrabold text-[var(--color-text-primary)] uppercase tracking-widest flex items-center gap-2">
                Execution Logs
              </h4>
              <span className="px-3 py-1 bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)] rounded-full text-xs font-bold border border-[var(--color-border)] shadow-sm">
                {logs.length} logs
              </span>
            </div>
            <div className="flex-1 bg-white border border-[var(--color-border)] rounded-3xl overflow-y-auto p-5 space-y-3 shadow-sm relative">
              {/* Timeline line */}
              {logs.length > 0 && !logsLoading && (
                <div className="absolute left-8 top-8 bottom-8 w-px bg-[var(--color-border)] z-0"></div>
              )}

              {logsLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] gap-3">
                   <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin"></div>
                   <p className="text-sm font-medium">Loading logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[var(--color-bg-sunken)] rounded-2xl border border-[var(--color-border)]">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 border border-[var(--color-border)] shadow-sm">
                    <Info className="w-8 h-8 text-[var(--color-text-secondary)]" />
                  </div>
                  <p className="text-sm font-bold text-[var(--color-text-secondary)]">No logs available</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="relative z-10 flex gap-4">
                    <div className="shrink-0 mt-1">
                      {log.status === 'success' ? (
                        <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white flex items-center justify-center ring-1 ring-green-200">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        </div>
                      ) : log.status === 'failed' ? (
                        <div className="w-6 h-6 rounded-full bg-red-100 border-2 border-white flex items-center justify-center ring-1 ring-red-200">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center ring-1 ring-blue-200">
                          <Info className="w-3 h-3 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-2xl p-3.5 pb-4">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-relaxed">{log.message}</p>
                      <span className="text-[10px] font-bold text-[var(--color-text-secondary)] mt-2 block uppercase tracking-wider">
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
