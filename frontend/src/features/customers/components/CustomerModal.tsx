import React, { useState } from 'react';
import { X, Info, ShieldAlert } from 'lucide-react';
import { useCreateCustomer } from '../api/customers.api';
import toast from 'react-hot-toast';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const { mutate: createCustomer, isPending } = useCreateCustomer();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nationalId: '',
    address: '',
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;

    createCustomer(
      { ...formData },
      {
        onSuccess: () => {
          toast.success('Customer saved');
          onClose();
          setFormData({ name: '', phone: '', nationalId: '', address: '', notes: '' });
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || 'Failed to save customer');
        }
      }
    );
  };

  const isFormValid = formData.name.trim() && formData.phone.trim();

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
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-medium text-gray-900">Add Customer</h2>
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
              Customer registration is only required for credit sales. Walk-in cash and M-Pesa sales do not need a customer record.
            </p>
          </div>

          {/* Required Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-[#E5E1DA] pb-2 mb-3">
              Required Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g., John Kamau"
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
            </div>
          </div>

          {/* Optional Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-[#E5E1DA] pb-2 mb-3">
              Optional Details
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
              This customer's credit balance starts at KSH 0. You can extend credit during checkout when completing a credit sale.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md text-sm font-medium border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || isPending}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
              isFormValid && !isPending
                ? 'bg-[#D97706] text-white hover:bg-[#B45F06]'
                : 'bg-[#D97706]/50 text-white/80 cursor-not-allowed'
            }`}
          >
            {isPending ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};
