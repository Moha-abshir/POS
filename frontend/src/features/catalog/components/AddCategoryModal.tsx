import { AxiosError } from 'axios';
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateCategory } from '../api/catalog.api';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const createCategory = useCreateCategory();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await createCategory.mutateAsync(name);
      onClose();
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to create category');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[480px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-[0.97]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
            Add Category
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer select-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label htmlFor="name" className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2">
              Category Name
            </label>
            <input
              ref={inputRef}
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
            />
            {errorMsg && (
              <p className="mt-2 text-[var(--text-sm)] text-[var(--color-danger)]">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer select-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCategory.isPending || !name}
              className="h-10 px-6 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
            >
              {createCategory.isPending ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                'Add Category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
