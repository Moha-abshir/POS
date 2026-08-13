import React from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

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
  const cashierName = ((meData?.user?.firstName || '') + ' ' + (meData?.user?.lastName || '')).trim() || meData?.user?.name || meData?.user?.username || 'Cashier';

  const receiptNo = paymentData.payment?.mpesaReceiptNumber 
    ? `Pym${paymentData.payment.mpesaReceiptNumber}`
    : `Pym${(paymentData.payment?.id || '').slice(0, 8).toUpperCase()}`;

  const customerNo = paymentData.customer?.nationalId
    ? `CUST${paymentData.customer.nationalId}`
    : `CUST${(paymentData.customer?.id || '').slice(0, 6).toUpperCase()}`;

  const paymentDate = paymentData.payment?.createdAt ? new Date(paymentData.payment.createdAt) : new Date();

  const generateEscPosData = (paymentData: any, meData: any) => {
    const ESC = '\x1b';
    const GS = '\x1d';
    const LINE_WIDTH = 42;
    const SEPARATOR = '-'.repeat(LINE_WIDTH) + '\n';
    
    const alignRow = (label: string, value: string) => {
      const gap = Math.max(1, LINE_WIDTH - label.length - value.length);
      return label + ' '.repeat(gap) + value + '\n';
    };

    let commands = '';
    commands += ESC + '@'; // Initialize printer
    
    const isHeaderless = localStorage.getItem('receipt_headerless') === 'true';

    // ── Header (Centered, Bold) ──
    if (!isHeaderless) {
      commands += ESC + 'a' + '\x01'; // Center align
      commands += ESC + 'E' + '\x01'; // Bold ON
      const businessName = meData?.business?.name || 'STORE RECEIPT';
      commands += businessName.toUpperCase() + '\n';
      commands += ESC + 'E' + '\x00'; // Bold OFF
      
      if (meData?.business?.sector) commands += meData.business.sector.toUpperCase() + '\n';
      if (meData?.business?.email) commands += meData.business.email + '\n';
      if (meData?.business?.location) commands += meData.business.location + '\n';
      if (meData?.business?.phone) commands += 'TEL: ' + meData.business.phone + '\n';
      if (meData?.business?.tillNumber || meData?.business?.mpesaShortcode) {
        commands += 'BUY GOODS : ' + (meData?.business?.tillNumber || meData?.business?.mpesaShortcode) + '\n';
      }
      commands += '\n';
    }

    // ── Receipt Title ──
    commands += ESC + 'E' + '\x01';
    commands += 'PAYMENT RECEIPT\n';
    commands += ESC + 'E' + '\x00';
    commands += SEPARATOR;

    // ── Metadata (Left aligned) ──
    commands += ESC + 'a' + '\x00'; // Left align
    commands += alignRow('Receipt No', receiptNo);
    commands += alignRow('Customer No', customerNo);
    commands += alignRow('Customer', (paymentData.customer?.name || '').toUpperCase());
    commands += alignRow('Date', format(paymentDate, 'dd/MM/yyyy'));
    commands += alignRow('Time', format(paymentDate, 'hh:mm:ss a'));
    commands += SEPARATOR;

    // ── Breakdown Block ──
    commands += alignRow('Previous Balance', paymentData.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    commands += alignRow('Amount Paid', paymentData.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    commands += ESC + 'E' + '\x01';
    commands += alignRow('New Total Balance', paymentData.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    commands += ESC + 'E' + '\x00';
    commands += SEPARATOR;

    // ── Footer (Centered) ──
    commands += ESC + 'a' + '\x01';
    commands += `You were served by : ${cashierName}\n\n`;
    commands += `Thank you for your payment!\n`;

    // ── Paper Feed & Cut ──
    commands += '\n\n\n\n';
    commands += GS + 'V' + '\x42' + '\x00'; // Partial cut
    commands += ESC + 'p' + '\x00' + '\x19' + '\xfa'; // Cash drawer kick

    const bytes = new Uint8Array(commands.length);
    for (let i = 0; i < commands.length; i++) {
      bytes[i] = commands.charCodeAt(i) & 0xff;
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const handlePrint = async () => {
    // 1. Try silent print via local print agent
    try {
      const agentCheck = await fetch('http://localhost:4000/status', { method: 'GET' });
      if (agentCheck.ok && paymentData) {
        const printersRes = await fetch('http://localhost:4000/printers');
        const printersData = await printersRes.json();
        const printersList = printersData.printers || [];
        
        let targetPrinter = 'E-POS ECO250';
        if (printersList.length > 0) {
          const match = printersList.find((p: string) => p.toUpperCase().includes('E-POS') || p.toUpperCase().includes('POS'));
          targetPrinter = match || printersList[0];
        }
        
        const rawBase64 = generateEscPosData(paymentData, meData);
        
        const printJob = await fetch('http://localhost:4000/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ printer: targetPrinter, raw_base64: rawBase64 })
        });
        
        if (printJob.ok) {
          toast.success(`Printed silently on ${targetPrinter}!`);
          return;
        }
      }
    } catch (err) {
      console.log('Local print agent offline, falling back to browser print dialog.');
    }

    // 2. Fallback to standard browser print
    const printContent = document.getElementById('printable-payment-receipt');
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = `PaymentReceipt-${receiptNo}`;

    const existing = document.getElementById('temp-print-container');
    if (existing) existing.remove();

    const printContainer = document.createElement('div');
    printContainer.id = 'temp-print-container';
    printContainer.innerHTML = printContent.outerHTML;
    document.body.appendChild(printContainer);

    window.print();

    setTimeout(() => {
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Print styles stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          body > *:not(#temp-print-container) {
            display: none !important;
          }
          body > #temp-print-container {
            display: block !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-payment-receipt {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 2mm !important;
            display: block !important;
            background: white !important;
            color: black !important;
            page-break-inside: avoid !important;
          }
          #printable-payment-receipt * {
            color: black !important;
            text-shadow: none !important;
          }
        }
      `}} />

      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[var(--color-bg-base)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--color-border)] z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">Receipt Preview</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">{receiptNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] rounded-md transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer size={20} />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50 flex justify-center items-start">
          <div id="print-root-wrapper" className="w-full">
            {/* Receipt Roll Container */}
            <div 
              id="printable-payment-receipt" 
              className="relative w-full max-w-[360px] mx-auto bg-white text-gray-900 shadow-lg border border-gray-200/60 flex flex-col"
            >
              {/* Receipt Inner Paper */}
              <div className="px-6 py-6 font-mono text-xs leading-relaxed">
                
                {/* Store Header (Dynamic SaaS Business Info) */}
                {localStorage.getItem('receipt_headerless') !== 'true' && (
                  <div className="text-center space-y-0.5 mb-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
                      {business.name || 'STORE RECEIPT'}
                    </h3>
                    {business.sector && (
                      <p className="text-[11px] text-gray-600 uppercase tracking-widest">{business.sector}</p>
                    )}
                    {business.email && (
                      <p className="text-[11px] text-gray-600">{business.email}</p>
                    )}
                    {business.location && (
                      <p className="text-[11px] text-gray-600">{business.location}</p>
                    )}
                    {business.phone && (
                      <p className="text-[11px] text-gray-700 font-bold">TEL: {business.phone}</p>
                    )}
                    {(business.tillNumber || business.mpesaShortcode) && (
                      <p className="text-[11px] font-extrabold text-gray-900">BUY GOODS : {business.tillNumber || business.mpesaShortcode}</p>
                    )}
                  </div>
                )}

                {/* Receipt Type */}
                <div className="text-center my-3">
                  <h4 className="text-xs font-extrabold tracking-widest text-gray-900">
                    PAYMENT RECEIPT
                  </h4>
                  <div className="text-gray-400 text-[10px]">------------------------------------------------</div>
                </div>

                {/* Receipt Metadata */}
                <div className="space-y-1 text-[11px] text-gray-900 mb-3">
                  <div className="flex justify-between">
                    <span>Receipt No :</span>
                    <span className="font-bold">{receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer No:</span>
                    <span className="font-bold">{customerNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer   :</span>
                    <span className="font-bold truncate max-w-[180px]">{(paymentData.customer?.name || '').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date       :</span>
                    <span>{format(paymentDate, 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time       :</span>
                    <span>{format(paymentDate, 'hh:mm:ss a')}</span>
                  </div>
                </div>

                <div className="text-gray-400 text-[10px]">------------------------------------------------</div>

                {/* Financial Breakdown */}
                <div className="space-y-1.5 text-[11px] font-medium text-gray-900 my-3">
                  <div className="flex justify-between">
                    <span>Previous Balance :</span>
                    <span>{paymentData.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Amount Paid :</span>
                    <span className="font-bold">{paymentData.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between font-extrabold text-gray-950 pt-0.5 border-t border-dashed border-gray-300">
                    <span>New Total Balance :</span>
                    <span>{paymentData.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="text-gray-400 text-[10px]">------------------------------------------------</div>

                {/* Footer Information */}
                <div className="text-center space-y-2 mt-4 text-[10px] text-gray-800">
                  <p>You were served by : {cashierName}</p>
                  <p className="font-semibold">Thank you for your payment!</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

