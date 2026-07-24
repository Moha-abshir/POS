import React, { useState, useEffect } from 'react';
import { X, Info, ShieldAlert } from 'lucide-react';
import { useCreateCustomer, useUpdateCustomer, type Customer } from '../api/customers.api';
import toast from 'react-hot-toast';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customerToEdit }) => {
  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nationalId: '',
    address: '',
    notes: '',
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    amountOwed: '',
    periodOwed: 'within 30 days',
  });

  useEffect(() => {
    if (customerToEdit && isOpen) {
      setFormData({
        name: customerToEdit.name || '',
        phone: customerToEdit.phone || '',
        nationalId: customerToEdit.nationalId || '',
        address: customerToEdit.address || '',
        notes: customerToEdit.notes || '',
        type: customerToEdit.type || 'INDIVIDUAL',
        amountOwed: customerToEdit.balance ? customerToEdit.balance.toString() : '',
        periodOwed: customerToEdit.periodOwed || 'within 30 days',
      });
    } else if (!isOpen) {
      setFormData({ name: '', phone: '', nationalId: '', address: '', notes: '', type: 'INDIVIDUAL', amountOwed: '', periodOwed: 'within 30 days' });
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;

    if (customerToEdit) {
      updateCustomer(
        {
          id: customerToEdit.id,
          name: formData.name,
          phone: formData.phone,
          nationalId: formData.nationalId,
          address: formData.address,
          notes: formData.notes,
          type: formData.type,
          periodOwed: formData.amountOwed && Number(formData.amountOwed) > 0 ? formData.periodOwed : undefined,
          balance: formData.amountOwed ? Number(formData.amountOwed) : 0,
        },
        {
          onSuccess: () => {
            toast.success('Customer updated successfully');
            onClose();
          },
          onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update customer');
          }
        }
      );
    } else {
      createCustomer(
        {
          name: formData.name,
          phone: formData.phone,
          nationalId: formData.nationalId,
          address: formData.address,
          notes: formData.notes,
          type: formData.type,
          amountOwed: formData.amountOwed ? Number(formData.amountOwed) : 0,
          periodOwed: formData.amountOwed && Number(formData.amountOwed) > 0 ? formData.periodOwed : undefined,
        },
        {
          onSuccess: () => {
            toast.success('Customer added successfully');
            onClose();
            setFormData({ name: '', phone: '', nationalId: '', address: '', notes: '', type: 'INDIVIDUAL', amountOwed: '', periodOwed: 'within 30 days' });
          },
          onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save customer');
          }
        }
      );
    }
  };

  const isFormValid = formData.name.trim() && formData.phone.trim();
  const isPending = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-[440px] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E1DA] shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {customerToEdit ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          
          {/* Info Banner */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-xs leading-relaxed">
              Customer registration is required for credit sales or tracking existing debt. Walk-in cash sales do not require customer profiles.
            </p>
          </div>

          {/* Required Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 pb-2 border-b border-[#E5E1DA] mb-3">
              Required Fields
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder={formData.type === 'BUSINESS' ? "e.g., Acme Hardware Ltd" : "e.g., John Kamau"}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g., 0712 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'INDIVIDUAL' | 'BUSINESS' }))}
                  className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
            </div>
          </div>

          {/* Initial Debt / Amount Owed Section */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 pb-2 border-b border-[#E5E1DA] mb-3">
              Existing Balance / Debt <span className="text-gray-400 font-normal">(optional)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount Owed <span className="text-gray-400 font-normal">(KES)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={formData.amountOwed}
                  onChange={(e) => setFormData(prev => ({ ...prev, amountOwed: e.target.value }))}
                  className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Period Owed
                </label>
                <select
                  value={formData.periodOwed}
                  onChange={(e) => setFormData(prev => ({ ...prev, periodOwed: e.target.value }))}
                  disabled={!formData.amountOwed || Number(formData.amountOwed) <= 0}
                  className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 disabled:opacity-50"
                >
                  <option value="within 30 days">within 30 days</option>
                  <option value="30 to 60 days">30 to 60 days</option>
                  <option value="60 to 90 days">60 to 90 days</option>
                  <option value=">90 days">&gt;90 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 pb-2 border-b border-[#E5E1DA] mb-3">
              Optional Fields
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    National ID <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
                    className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Contractor, usually buys in bulk"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-[#F7F6F4] border border-[#E5E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Credit Note */}
          <div className="flex items-start gap-2.5 bg-[#F7F6F4] border border-[#E5E1DA] rounded-md p-3 text-gray-500">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
            <p className="text-xs leading-relaxed">
              If an initial amount owed is specified, the customer will start with that outstanding debt. Additional credit is extended during checkout.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E1DA] bg-white rounded-b-xl flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 h-9 text-sm font-medium text-gray-600 bg-white border border-[#E5E1DA] rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || isPending}
            className={`px-4 h-9 text-sm font-medium text-white rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              isFormValid && !isPending
                ? 'bg-[#D97706] hover:bg-[#B45309] shadow-sm'
                : 'bg-[#D97706]/50 cursor-not-allowed'
            }`}
          >
            {isPending ? 'Saving...' : customerToEdit ? 'Save Changes' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};
