import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useUpdateProduct, type Product } from '../../api/catalog.api';
import { AxiosError } from 'axios';

interface DeactivateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export const DeactivateConfirmModal: React.FC<DeactivateConfirmModalProps> = ({ isOpen, onClose, product }) => {
  const updateProduct = useUpdateProduct();
  const [errorMsg, setErrorMsg] = useState('');

  const isActive = product.isActive;

  const handleConfirm = async () => {
    setErrorMsg('');
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: { isActive: !isActive }
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || `Failed to ${isActive ? 'deactivate' : 'reactivate'} product`);
    }
  };

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[400px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.97]'}`}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className={`text-[var(--text-lg)] font-semibold ${isActive ? 'text-red-500' : 'text-green-600'}`}>
            {isActive ? 'Deactivate Product?' : 'Reactivate Product?'}
          </h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-[var(--text-md)] font-medium text-[var(--color-text-primary)]">
            {isActive ? `Deactivate ${product.name}?` : `Reactivate ${product.name}?`}
          </p>

          <div className="flex gap-3 text-[13px] text-[var(--color-text-muted)] leading-relaxed bg-[var(--color-bg-inset)] p-3 rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-amber-500' : 'text-blue-500'}`} />
            <p>
              {isActive 
                ? "This product will no longer appear in the POS or catalog. All historical records are preserved."
                : "This product will become available again in the POS and catalog."}
            </p>
          </div>

          {errorMsg && <div className="text-red-500 text-[var(--text-sm)]">{errorMsg}</div>}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={updateProduct.isPending} 
              className={`h-10 px-6 text-white text-[var(--text-sm)] font-medium rounded-[var(--radius-md)] transition-colors disabled:opacity-50 ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {updateProduct.isPending ? 'Processing...' : (isActive ? 'Deactivate' : 'Reactivate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
