import React from 'react';
import { X, UserCircle, Phone, MapPin, Receipt, Calendar, Download } from 'lucide-react';
import { type Customer, useCustomerPurchases } from '../api/customers.api';
import { format } from 'date-fns';
import { LoadingSpinner } from '../../../components/ui/Loading';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ isOpen, onClose, customer }) => {
  const { data: purchases, isLoading } = useCustomerPurchases(customer?.id);

  if (!isOpen || !customer) return null;

  const initials = customer.name.substring(0, 2).toUpperCase();

  const handleExportCSV = () => {
    if (!purchases || purchases.length === 0) return;

    const headers = ['Date', 'Receipt #', 'Total Amount', 'Amount Paid', 'Debt', 'Payment Method'];
    const rows = purchases.map((p: any) => {
      const date = format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm');
      const receipt = p.receiptNumber || p.id.slice(0, 8);
      const total = Number(p.totalAmount);
      const paid = Number(p.amountPaid);
      const debt = total > paid ? total - paid : 0;
      return [
        `"${date}"`,
        `"${receipt}"`,
        total,
        paid,
        debt,
        `"${p.paymentMethod}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${customer?.name.replace(/\\s+/g, '_')}_purchases.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-medium text-gray-900">Customer Profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
          
          {/* Left Column: Details */}
          <div className="w-full md:w-1/3 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold mb-3">
                {initials}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
              <p className={`mt-1 text-sm font-medium ${Number(customer.balance) > 0 ? 'text-[#D97706]' : 'text-green-600'}`}>
                Balance: KSH {Number(customer.balance).toLocaleString()}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              {customer.phone && (
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">{customer.phone}</span>
                </div>
              )}
              {customer.nationalId && (
                <div className="flex items-start gap-3 text-sm">
                  <UserCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">ID: {customer.nationalId}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">{customer.address}</span>
                </div>
              )}
              {customer.createdAt && (
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600">Joined {format(new Date(customer.createdAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {customer.notes && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column: Purchases */}
          <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-6 md:pt-0">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-400" />
                Recent Purchases
              </h4>
              {purchases && purchases.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#D97706] bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-md transition-colors border border-amber-200 shadow-sm"
                  title="Export purchases to spreadsheet"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : purchases && purchases.length > 0 ? (
              <div className="space-y-3">
                {purchases.map((purchase: any) => (
                  <div key={purchase.id} className="p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(purchase.createdAt), 'MMM d, yyyy - h:mm a')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        Total: KSH {Number(purchase.totalAmount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-start mb-1 text-xs">
                      <span className="text-green-600 font-medium">
                        Paid: KSH {Number(purchase.amountPaid).toLocaleString()}
                      </span>
                      {Number(purchase.totalAmount) > Number(purchase.amountPaid) && (
                        <span className="text-amber-600 font-medium">
                          Debt: KSH {(Number(purchase.totalAmount) - Number(purchase.amountPaid)).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1 pt-1 border-t border-gray-100">
                      <span>Receipt #{purchase.receiptNumber || purchase.id.slice(0, 8)}</span>
                      <span className={purchase.paymentMethod === 'CREDIT' ? 'text-amber-600 font-medium' : ''}>
                        {purchase.paymentMethod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No purchases found for this customer.</p>
              </div>
            )}
          </div>
          
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
