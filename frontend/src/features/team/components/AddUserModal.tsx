import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAddTeamMember } from '../api/team.api';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const addTeamMember = useAddTeamMember();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await addTeamMember.mutateAsync(email);
      onClose();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error?.message || 'Failed to add cashier');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      <div className="relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[480px] m-4 flex flex-col scale-100 opacity-100 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
            Add Cashier
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
            <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mb-4">
              Enter the email address of the cashier. They will be able to log in and process sales, but cannot view reports or manage the team.
            </p>
            
            <label htmlFor="email" className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cashier@store.com"
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
              disabled={addTeamMember.isPending || !email}
              className="h-10 px-6 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
            >
              {addTeamMember.isPending ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                'Add Cashier'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
