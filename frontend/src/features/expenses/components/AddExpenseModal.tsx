import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateExpense } from '../api/expenses.api';
import { toast } from 'react-hot-toast';
import { AxiosError } from 'axios';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PREDEFINED_CATEGORIES = [
  'Rent',
  'Electricity',
  'Water',
  'Salaries',
  'Internet',
  'Marketing',
  'Cleaning Supplies',
  'Transport',
  'Licenses & Permits',
  'Miscellaneous',
  'Other',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const createExpense = useCreateExpense();
  
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory(PREDEFINED_CATEGORIES[0]);
      setCustomCategory('');
      setAmount('');
      setDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]); // defaults to today
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalCategory = category === 'Other' ? customCategory.trim() : category;

    if (!finalCategory) {
      setErrorMsg('Please specify a category.');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      await createExpense.mutateAsync({
        category: finalCategory,
        amount: Number(amount),
        description: description.trim() || undefined,
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : undefined,
      });
      toast.success('Expense recorded successfully');
      onClose();
    } catch (err) {
      setErrorMsg(
        (err as AxiosError<{ message: string }>).response?.data?.message || 
        'Failed to record expense'
      );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      <div className={`relative bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-[480px] m-4 flex flex-col transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-[0.97]'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-[var(--text-lg)] font-bold text-[var(--color-text-primary)]">
            Record New Expense
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer select-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Category Selector */}
          <div>
            <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
            >
              {PREDEFINED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Category Input (Only shows when 'Other' is selected) */}
          {category === 'Other' && (
            <div>
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1.5">
                Specify Category
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g., Office Supplies"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>
          )}

          {/* Amount field */}
          <div>
            <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1.5">
              Amount (KES)
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 5000"
              className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
            />
          </div>

          {/* Expense Date field */}
          <div>
            <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
            />
          </div>

          {/* Description field */}
          <div>
            <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this expense..."
              className="block w-full p-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              rows={3}
            />
          </div>

          {errorMsg && (
            <p className="text-[var(--text-sm)] text-[var(--color-danger)] font-medium">
              {errorMsg}
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer select-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createExpense.isPending}
              className="h-10 px-6 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
            >
              {createExpense.isPending ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                'Record Expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
