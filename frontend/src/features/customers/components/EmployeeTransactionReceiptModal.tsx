import React from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export interface EmployeeReceiptData {
  type: 'PAYOUT' | 'DEPOSIT';
  payment: any;
  customer: any;
  previousBalance: number; // Previous Net Salary
  amountPaid: number;
  newBalance: number; // New Net Salary
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
  const title = isDeposit ? 'EMPLOYEE SAVINGS DEPOSIT' : 'EMPLOYEE SALARY PAYOUT';

  const receiptNo = receiptData.payment?.mpesaReceiptNumber 
    ? `EMP-${receiptData.payment.mpesaReceiptNumber}`
    : `EMP-${(receiptData.payment?.id || '').slice(0, 8).toUpperCase()}`;

  const customerNo = receiptData.customer?.nationalId
    ? `EMP${receiptData.customer.nationalId}`
    : `EMP${(receiptData.customer?.id || '').slice(0, 6).toUpperCase()}`;

  const transactionDate = receiptData.payment?.paidAt ? new Date(receiptData.payment.paidAt) : (receiptData.payment?.createdAt ? new Date(receiptData.payment.createdAt) : new Date());

  const formatNetSalary = (val: number) => {
    if (val < 0) {
      return `- KSh ${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (val > 0) {
      return `+ KSh ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Owed to Store)`;
    }
    return `KSh 0.00`;
  };

  const generateEscPosData = (rData: EmployeeReceiptData, meData: any) => {
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
    commands += ESC + 'a' + '\x01'; // Center
    commands += ESC + 'E' + '\x01';
    commands += `${title}\n`;
    commands += ESC + 'E' + '\x00';
    commands += SEPARATOR;

    // ── Metadata (Left aligned) ──
    commands += ESC + 'a' + '\x00'; // Left align
    commands += alignRow('Receipt No', receiptNo);
    commands += alignRow('Employee ID', customerNo);
    commands += alignRow('Employee', (rData.customer?.name || '').toUpperCase());
    commands += alignRow('Date', format(transactionDate, 'dd/MM/yyyy'));
    commands += alignRow('Time', format(transactionDate, 'hh:mm:ss a'));
    commands += SEPARATOR;

    // ── Breakdown Block ──
    commands += alignRow('Base Salary', Number(rData.customer?.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (Number(rData.customer?.additionalSavings || 0) > 0 || isDeposit) {
      commands += alignRow('Personal Savings', Number(rData.customer?.additionalSavings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    commands += alignRow('Prev Net Salary', formatNetSalary(rData.previousBalance));
    commands += alignRow(isDeposit ? 'Deposit Amount' : 'Payout Amount', rData.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    commands += alignRow('Method', rData.payment?.method || 'CASH');
    if (rData.payment?.mpesaReceiptNumber) {
      commands += alignRow('M-Pesa Ref', rData.payment.mpesaReceiptNumber);
    }
    commands += ESC + 'E' + '\x01';
    commands += alignRow('New Net Salary', formatNetSalary(rData.newBalance));
    commands += ESC + 'E' + '\x00';
    commands += SEPARATOR;

    // ── Footer (Centered) ──
    commands += ESC + 'a' + '\x01';
    commands += `Served by : ${cashierName}\n\n`;
    commands += isDeposit ? `Savings acknowledged.\n` : `Salary payout confirmed.\n`;

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${isDeposit ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center`}>
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 font-mono">{receiptNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content Visualizer */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-gray-800 leading-relaxed bg-white">
          <div id="printable-employee-receipt" className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            {/* Store branding */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300">
              <h2 className="font-bold text-sm tracking-wide text-gray-900 uppercase">
                {business.name || 'STORE RECEIPT'}
              </h2>
              {business.location && <p className="text-[11px] text-gray-500">{business.location}</p>}
              {business.phone && <p className="text-[11px] text-gray-500">TEL: {business.phone}</p>}
              {(business.tillNumber || business.mpesaShortcode) && (
                <p className="text-[11px] font-semibold text-gray-600">
                  BUY GOODS: {business.tillNumber || business.mpesaShortcode}
                </p>
              )}
            </div>

            {/* Receipt Type Title */}
            <div className="py-2 text-center border-b border-dashed border-gray-300">
              <span className={`font-bold text-[11px] tracking-wider uppercase ${isDeposit ? 'text-blue-700' : 'text-emerald-700'}`}>
                {title}
              </span>
            </div>

            {/* Transaction details */}
            <div className="py-3 border-b border-dashed border-gray-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Receipt No:</span>
                <span className="font-semibold">{receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Employee ID:</span>
                <span>{customerNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Employee:</span>
                <span className="font-semibold">{receiptData.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span>{format(transactionDate, 'dd/MM/yyyy hh:mm a')}</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="py-3 border-b border-dashed border-gray-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Base Salary:</span>
                <span>KSh {Number(receiptData.customer?.baseSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {(Number(receiptData.customer?.additionalSavings || 0) > 0 || isDeposit) && (
                <div className="flex justify-between text-blue-700">
                  <span>Personal Savings:</span>
                  <span className="font-semibold">KSh {Number(receiptData.customer?.additionalSavings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Prev Net Salary:</span>
                <span className={receiptData.previousBalance < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-semibold'}>
                  {formatNetSalary(receiptData.previousBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-gray-200">
                <span className="text-gray-900">{isDeposit ? 'Deposit Received:' : 'Payout Given:'}</span>
                <span className={isDeposit ? 'text-blue-700' : 'text-emerald-700'}>
                  KSh {receiptData.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Payment Method:</span>
                <span>{receiptData.payment?.method || 'CASH'}</span>
              </div>
              {receiptData.payment?.mpesaReceiptNumber && (
                <div className="flex justify-between text-[11px] text-emerald-600 font-semibold">
                  <span>M-Pesa Ref:</span>
                  <span>{receiptData.payment.mpesaReceiptNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t border-gray-300">
                <span className="text-gray-900">New Net Salary:</span>
                <span className={receiptData.newBalance < 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {formatNetSalary(receiptData.newBalance)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 text-center text-gray-500 space-y-1">
              <p>Served by: <span className="font-semibold text-gray-700">{cashierName}</span></p>
              <p className="text-[10px] text-gray-400 font-sans">
                {isDeposit ? 'Personal savings held in safekeeping.' : 'Thank you for your service!'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
