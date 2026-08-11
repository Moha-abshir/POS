import React from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface CustomerPaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    payment: any;
    customer: any;
    previousBalance: number;
    amountPaid: number;
    newBalance: number;
  } | null;
}

export const CustomerPaymentReceiptModal: React.FC<CustomerPaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  paymentData
}) => {
  // Fetch current user and business details
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
    enabled: isOpen,
  });

  if (!isOpen || !paymentData) return null;

  const business = meData?.business || {};
  const cashierName = meData?.user?.name || meData?.user?.username || 'Cashier';

  const receiptNo = paymentData.payment?.mpesaReceiptNumber 
    ? `Pym${paymentData.payment.mpesaReceiptNumber}`
    : `Pym${(paymentData.payment?.id || '').slice(0, 8).toUpperCase()}`;

  const customerNo = paymentData.customer?.nationalId
    ? `CUST${paymentData.customer.nationalId}`
    : `CUST${(paymentData.customer?.id || '').slice(0, 6).toUpperCase()}`;

  const paymentDate = paymentData.payment?.createdAt ? new Date(paymentData.payment.createdAt) : new Date();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      {/* Hide surrounding UI during window.print() */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-payment-receipt, #thermal-payment-receipt * {
            visibility: visible;
          }
          #thermal-payment-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 10px;
            font-family: monospace;
            color: #000;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Actions */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 no-print">
          <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Payment Recorded Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container */}
        <div className="p-6 overflow-y-auto max-h-[75vh] flex justify-center bg-gray-50/50">
          <div
            id="thermal-payment-receipt"
            className="w-[320px] bg-white p-5 shadow-sm border border-gray-200 rounded-lg font-mono text-xs text-gray-900 leading-tight select-text"
          >
            {/* Business Header */}
            <div className="text-center font-bold uppercase tracking-wide space-y-1 mb-3">
              <p className="text-sm font-black">{business.name || 'ABU-RAYAN GENERAL STORE'}</p>
              {business.email && <p className="normal-case text-[11px] font-normal">{business.email}</p>}
              {business.address && <p className="text-[11px] font-normal">{business.address}</p>}
              {business.phone && <p className="text-[11px] font-normal">{business.phone}</p>}
              {business.mpesaShortcode && (
                <p className="text-[11px] font-bold">BUY GOODS : {business.mpesaShortcode}</p>
              )}
            </div>

            <div className="text-center font-bold text-sm my-2 uppercase tracking-wide">
              Payment Receipt
            </div>

            <p className="text-center my-2 text-gray-400">------------------------------------------</p>

            {/* Receipt Metadata */}
            <div className="space-y-1 my-2">
              <div className="flex justify-between">
                <span>Receipt No :</span>
                <span className="font-bold">{receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer No:</span>
                <span className="font-bold">{customerNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer Name:</span>
                <span className="font-bold truncate max-w-[170px]">{(paymentData.customer?.name || '').toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Date :</span>
                <span>{format(paymentDate, 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span>Time :</span>
                <span>{format(paymentDate, 'hh:mm:ss a')}</span>
              </div>
            </div>

            <p className="text-center my-2 text-gray-400">------------------------------------------</p>

            {/* Financial Breakdown */}
            <div className="space-y-2.5 my-3">
              <div className="flex justify-between items-center text-sm">
                <span>Balance Brought Forward :</span>
                <span className="font-bold">
                  {paymentData.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span>Amount Paid :</span>
                <span className="font-black text-green-700">
                  {paymentData.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm pt-1 border-t border-dashed border-gray-300">
                <span>Balance Carried Forward :</span>
                <span className="font-black text-gray-900">
                  {paymentData.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-center my-2 text-gray-400">------------------------------------------</p>

            {/* Footer Information */}
            <div className="text-center space-y-1.5 my-3 text-[11px]">
              <p>You were served by :{cashierName}</p>
              <p className="font-semibold text-[10px]">Goods Once Sold Cannot Be Returned,Thanks.</p>
              <p className="text-[9px] text-gray-500 pt-1">Designed by Starlinkstechnologies LTD 0728 377 16!</p>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 h-10 rounded-xl text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 h-10 rounded-xl bg-gray-900 hover:bg-black text-white font-bold transition-all flex items-center gap-2 text-sm shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>

      </div>
    </div>
  );
};
