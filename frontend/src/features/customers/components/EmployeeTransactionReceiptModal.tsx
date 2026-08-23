import React from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export interface EmployeeReceiptData {
  type: 'SETTLEMENT' | 'PAYOUT' | 'DEPOSIT';
  payment: any;
  customer: any;
  previousBalance: number;
  amountPaid: number;
  newBalance: number;
}

interface EmployeeTransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: EmployeeReceiptData | null;
}

export const EmployeeTransactionReceiptModal: React.FC<EmployeeTransactionReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptData
}) => {
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
    enabled: isOpen,
  });

  if (!isOpen || !receiptData) return null;

  const business = meData?.business || {};
  const cashierName = ((meData?.user?.firstName || '') + ' ' + (meData?.user?.lastName || '')).trim() || meData?.user?.name || meData?.user?.username || 'Cashier';

  const isDeposit = receiptData.type === 'DEPOSIT';
  const isSettlement = receiptData.type === 'SETTLEMENT';
  const receiptTitle = isSettlement ? 'EMPLOYEE SALARY SETTLEMENT' : (isDeposit ? 'EMPLOYEE SAVINGS DEPOSIT' : 'EMPLOYEE SALARY ADVANCE');

  const receiptNo = receiptData.payment?.mpesaReceiptNumber 
    ? `EMP-${receiptData.payment.mpesaReceiptNumber}`
    : `EMP-${(receiptData.payment?.id || '').slice(0, 8).toUpperCase()}`;

  const customerNo = receiptData.customer?.nationalId
    ? `EMP${receiptData.customer.nationalId}`
    : `EMP${(receiptData.customer?.id || '').slice(0, 6).toUpperCase()}`;

  const transactionDate = receiptData.payment?.paidAt 
    ? new Date(receiptData.payment.paidAt) 
    : (receiptData.payment?.createdAt ? new Date(receiptData.payment.createdAt) : new Date());

  const formatNetVal = (val: number) => {
    const num = Math.round(Number(val || 0) * 100) / 100;
    if (num === 0 || Object.is(num, -0)) return 'KSh 0.00';
    if (num < 0) return `- KSh ${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `+ KSh ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Owed)`;
  };

  const generateEscPosData = (rData: EmployeeReceiptData, meData: any) => {
    const ESC = '\x1b';
    const GS = '\x1d';
    const LINE_WIDTH = 42;
    const SEPARATOR = '------------------------------------------\n';
    
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
    commands += ESC + 'a' + '\x01';
    commands += ESC + 'E' + '\x01';
    commands += `${receiptTitle}\n`;
    commands += ESC + 'E' + '\x00';
    commands += SEPARATOR;

    // ── Metadata (Left aligned) ──
    commands += ESC + 'a' + '\x00'; // Left align
    commands += alignRow('Receipt No', receiptNo);
    commands += alignRow('Employee', (rData.customer?.name || '').toUpperCase());
    commands += alignRow('Date', format(transactionDate, 'dd/MM/yyyy'));
    commands += alignRow('Time', format(transactionDate, 'hh:mm:ss a'));
    commands += SEPARATOR;

    // ── Breakdown Block ──
    commands += alignRow('Base Salary', Number(rData.customer?.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (Number(rData.customer?.additionalSavings || 0) > 0 || isDeposit) {
      commands += alignRow('Personal Savings', Number(rData.customer?.additionalSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    commands += alignRow('Prev Net Salary', formatNetVal(rData.previousBalance));
    commands += alignRow(isDeposit ? 'Deposit Amount' : 'Payout Amount', rData.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (rData.payment?.mpesaReceiptNumber) {
      commands += alignRow('M-Pesa Ref', rData.payment.mpesaReceiptNumber);
    }
    commands += ESC + 'E' + '\x01';
    commands += alignRow('New Net Salary', formatNetVal(rData.newBalance));
    commands += ESC + 'E' + '\x00';
    commands += SEPARATOR;

    // ── Footer (Centered) ──
    commands += ESC + 'a' + '\x01';
    commands += `You were served by : ${cashierName}\n\n`;
    commands += isSettlement 
      ? `Full salary settled. Cycle closed.\n` 
      : (isDeposit ? `Thank you! Savings safely recorded.\n` : `Salary advance confirmed.\n`);

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
      if (agentCheck.ok && receiptData) {
        const printersRes = await fetch('http://localhost:4000/printers');
        const printersData = await printersRes.json();
        const printersList = printersData.printers || [];
        
        let targetPrinter = 'E-POS ECO250';
        if (printersList.length > 0) {
          const match = printersList.find((p: string) => p.toUpperCase().includes('E-POS') || p.toUpperCase().includes('POS'));
          targetPrinter = match || printersList[0];
        }
        
        const rawBase64 = generateEscPosData(receiptData, meData);
        
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
    const printContent = document.getElementById('printable-employee-receipt');
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = `EmployeeReceipt-${receiptNo}`;

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
          #printable-employee-receipt {
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
          #printable-employee-receipt * {
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
              id="printable-employee-receipt" 
              className="relative w-full max-w-[360px] mx-auto bg-white text-gray-900 shadow-lg border border-gray-200/60 flex flex-col"
            >
              {/* Receipt Inner Paper */}
              <div className="px-6 py-6 font-mono text-xs leading-relaxed">
                
                {/* Store Header */}
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
                  <h4 className="text-xs font-extrabold tracking-widest text-gray-900 uppercase">
                    {receiptTitle}
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
                    <span>Employee   :</span>
                    <span className="font-bold truncate max-w-[180px]">{(receiptData.customer?.name || '').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date       :</span>
                    <span>{format(transactionDate, 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time       :</span>
                    <span>{format(transactionDate, 'hh:mm:ss a')}</span>
                  </div>
                </div>

                <div className="text-gray-400 text-[10px]">------------------------------------------------</div>

                {/* Financial Breakdown */}
                <div className="space-y-1.5 text-[11px] font-medium text-gray-900 my-3">
                  <div className="flex justify-between">
                    <span>Base Salary :</span>
                    <span>{Number(receiptData.customer?.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {(Number(receiptData.customer?.additionalSavings || 0) > 0 || isDeposit) && (
                    <div className="flex justify-between text-gray-900">
                      <span>Personal Savings :</span>
                      <span className="font-bold">{Number(receiptData.customer?.additionalSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Prev Net Salary :</span>
                    <span className="font-bold text-gray-900">
                      {formatNetVal(receiptData.previousBalance)}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-dashed border-gray-200">
                    <span>{isDeposit ? 'Deposit Received :' : 'Payout Given :'}</span>
                    <span className="font-bold text-gray-900">
                      {receiptData.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {receiptData.payment?.mpesaReceiptNumber && (
                    <div className="flex justify-between text-gray-900 text-[10px]">
                      <span>M-Pesa Ref :</span>
                      <span className="font-mono font-bold">{receiptData.payment.mpesaReceiptNumber}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-extrabold text-gray-950 pt-1.5 border-t border-dashed border-gray-300">
                    <span>New Net Salary :</span>
                    <span className="text-gray-950 font-extrabold">
                      {formatNetVal(receiptData.newBalance)}
                    </span>
                  </div>
                </div>

                <div className="text-gray-400 text-[10px]">------------------------------------------------</div>

                {/* Footer Information */}
                <div className="text-center space-y-2 mt-4 text-[10px] text-gray-800">
                  <p>You were served by : {cashierName}</p>
                  <p className="font-semibold">
                    {isSettlement ? 'Full salary settled. Cycle closed.' : (isDeposit ? 'Personal savings held in safekeeping.' : 'Salary advance confirmed.')}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
