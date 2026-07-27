import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { db } from '../../core/offline/offlineDatabase';
import toast from 'react-hot-toast';

export function ProductModeSettingsSection() {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasData, setHasData] = useState(false);

  // Fetch current business settings
  const { data: meData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    }
  });

  const currentMode = meData?.business?.productMode || 'ADVANCED';

  // Check if they already have products or transactions locally to disable switching
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const productCount = await db.products.count();
        if (productCount > 0) {
          setHasData(true);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkExistingData();
  }, []);

  const handleUpdateMode = async (mode: 'SIMPLE' | 'ADVANCED') => {
    if (mode === currentMode) return;
    
    if (currentMode === 'SIMPLE' && mode === 'ADVANCED') {
      toast.error('Once Simple Mode is selected, you cannot switch back to Advanced Mode.');
      return;
    }

    if (hasData && mode === 'SIMPLE') {
      toast.error('Cannot switch to Simple Mode: You already have products or transactions.');
      return;
    }

    const confirmSwitch = window.confirm(
      'Are you sure you want to switch to Simple Mode? This will lock the interface to a flat product view (no variants or packaging units) and cannot be undone.'
    );
    if (!confirmSwitch) return;

    setIsUpdating(true);
    try {
      await api.put('/auth/business/settings', { productMode: mode });
      toast.success(`Successfully switched to ${mode === 'SIMPLE' ? 'Simple flat' : 'Advanced'} product mode!`);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      // Reload page to re-prime the client state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to update product mode';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-5 md:p-8">
      <h2 className="text-base md:text-lg font-semibold mb-4 md:mb-6 text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-2 md:pb-3 flex items-center gap-2">
        Product Management Mode
      </h2>

      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Choose how you want to manage products in your catalog. If your store has simple products without multiple package units (e.g. pieces, boxes, bags) or variants (e.g. sizes, colors), we recommend using <strong>Simple flat Mode</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Advanced Mode Card */}
          <div 
            onClick={() => handleUpdateMode('ADVANCED')}
            className={`p-4 rounded-[var(--radius-md)] border-2 text-left cursor-pointer transition-all ${
              currentMode === 'ADVANCED' 
                ? 'border-gray-900 bg-gray-50/50' 
                : 'border-gray-200 hover:border-gray-300 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-sm">Advanced Mode (Default)</h3>
              {currentMode === 'ADVANCED' && <span className="text-[11px] font-bold text-white bg-gray-900 px-2 py-0.5 rounded-full">Active</span>}
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              Supports complex product variations (colors, sizes) and multiple package sales units (e.g. selling by Carton, Packet, and Single pieces from the same stock).
            </p>
          </div>

          {/* Simple Mode Card */}
          <div 
            onClick={() => currentMode === 'ADVANCED' && !hasData && handleUpdateMode('SIMPLE')}
            className={`p-4 rounded-[var(--radius-md)] border-2 text-left transition-all ${
              currentMode === 'SIMPLE' 
                ? 'border-gray-900 bg-gray-50/50 cursor-default' 
                : (hasData 
                    ? 'border-gray-100 bg-gray-50/30 opacity-40 cursor-not-allowed' 
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer')
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-sm">Simple flat Mode</h3>
              {currentMode === 'SIMPLE' && <span className="text-[11px] font-bold text-white bg-gray-900 px-2 py-0.5 rounded-full">Active</span>}
              {currentMode === 'ADVANCED' && hasData && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Locked</span>
              )}
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              Flat product layout. Each item has one name, code/SKU, purchase price, selling price, minimum price, and low stock alert level.
            </p>
          </div>
        </div>

        {currentMode === 'ADVANCED' && hasData && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-3 mt-3 text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Product Mode cannot be switched to <strong>Simple Mode</strong> because you already have active product catalog items in this business account.
            </p>
          </div>
        )}

        {currentMode === 'SIMPLE' && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-[var(--radius-md)] p-3 mt-3 text-gray-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              You are currently using <strong>Simple flat Mode</strong>. Switching back to Advanced Mode is locked to maintain catalog integrity.
            </p>
          </div>
        )}

        {isUpdating && (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 pt-2">
            <Loader2 className="animate-spin w-4 h-4" />
            Updating settings...
          </div>
        )}
      </div>
    </div>
  );
}
