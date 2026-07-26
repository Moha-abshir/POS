import React, { useState, useEffect } from 'react';
import { X, Printer, Receipt, RefreshCcw } from 'lucide-react';
import { useSaleDetails } from '../api/sales.api';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { RefundModal } from './RefundModal';
import { LoadingSpinner } from '../../../components/ui/Loading';
import { db } from '../../../core/offline/offlineDatabase';
import toast from 'react-hot-toast';

interface ReceiptModalProps {
  saleId: string | null;
  onClose: () => void;
}

export function ReceiptModal({ saleId, onClose }: ReceiptModalProps) {
  const { data: sale, isLoading } = useSaleDetails(saleId);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);

  // Fetch business and cashier details to display on the receipt
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
    enabled: !!saleId,
  });

  // Fetch customer details from Dexie or API when sale loaded
  useEffect(() => {
    if (sale?.customerId) {
      db.customers.get(sale.customerId).then(c => {
        if (c) {
          setCustomerDetails({
            customerNo: `CUST${c.id.slice(-4).toUpperCase()}`,
            balance: Number(c.balance) || 0,
            name: c.name
          });
        }
      }).catch(() => {});
    }
  }, [sale?.customerId]);

  const getPreviouslyRefundedQty = (item: any) => {
    if (!sale?.refunds) return 0;
    return sale.refunds.reduce((total: number, refund: any) => {
      const matched = refund.items?.find(
        (ri: any) => ri.variantId === item.variantId && ri.unitId === item.unitId
      );
      return total + (matched ? Number(matched.quantity) : 0);
    }, 0);
  };

  const getRemainingReturnableQty = () => {
    if (!sale?.items) return 0;
    return sale.items.reduce((total: number, item: any) => {
      const prevRefunded = getPreviouslyRefundedQty(item);
      return total + Math.max(0, Number(item.quantity) - prevRefunded);
    }, 0);
  };

  if (!saleId) return null;

  const generateEscPosData = (sale: any, meData: any, customerDetails: any) => {
    const ESC = '\x1b';
    const GS = '\x1d';
    
    let commands = '';
    
    // Initialize printer
    commands += ESC + '@';
    
    // Header (Centered, Bold)
    commands += ESC + 'a' + '\x01';
    commands += ESC + 'E' + '\x01';
    commands += (meData?.business?.name || 'ABU-RAYAN GENERAL STORE').toUpperCase() + '\n';
    commands += ESC + 'E' + '\x00';
    
    const email = meData?.business?.email || 'aburayangenstore@GMAIL.COM';
    commands += email + '\n';
    commands += 'PO.BOX 7180 -300301.\n';
    commands += (meData?.business?.phone || '0712 581 995') + '\n';
    commands += 'BUY GOODS : 8477996\n\n';
    
    // Title
    const isCredit = sale.paymentMethod === 'CREDIT' || (Number(sale.amountPaid) < Number(sale.totalAmount));
    commands += ESC + 'E' + '\x01';
    commands += isCredit ? 'CREDIT SALES\n' : 'CASH SALES\n';
    commands += ESC + 'E' + '\x00';
    commands += '------------------------------------------------\n';
    
    // Left aligned metadata
    commands += ESC + 'a' + '\x00';
    
    const invoiceNo = `CR${sale.id.slice(0, 6).toUpperCase()}`;
    const customerNo = customerDetails?.customerNo || (sale.customerId ? `CUST${sale.customerId.slice(-4).toUpperCase()}` : 'CUST157');
    const customerName = (sale.customerName || customerDetails?.name || 'NASTEXO').toUpperCase();
    const dateStr = format(new Date(sale.soldAt), 'dd/MM/yyyy');
    const timeStr = format(new Date(sale.soldAt), 'hh:mm:ss a');
    
    commands += `Invoice No :${invoiceNo}\n`;
    commands += `Customer No: ${customerNo}\n`;
    commands += `Customer Name:${customerName}\n`;
    commands += `Date :       ${dateStr}\n`;
    commands += `Time :       ${timeStr}\n`;
    commands += '------------------------------------------------\n';
    
    // Table Header
    commands += 'Name                   Qnty   Price        Total\n';
    commands += '------------------------------------------------\n';
    
    // Items list
    sale.items?.forEach((item: any) => {
      const isGenericVariant = !item.variantName || item.variantName === 'Default' || item.variantName === 'Standard';
      const displayName = (item.productName 
        ? `${item.productName}${isGenericVariant ? '' : ` - ${item.variantName}`}`
        : 'Item').toUpperCase();
        
      const qtyNum = Number(item.quantity) || 0;
      const qtyVal = Number.isInteger(qtyNum) ? qtyNum.toString() : qtyNum.toFixed(2);
      const qtyPriceStr = `${qtyVal} x ${Number(item.sellingPrice || item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const totalStr = Number(item.subtotal || item.totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      commands += displayName + '\n';
      
      // Right align line 2 columns to 48 width
      const spacesLen = Math.max(1, 48 - qtyPriceStr.length - totalStr.length);
      let spaces = '';
      for (let i = 0; i < spacesLen; i++) spaces += ' ';
      commands += spaces + qtyPriceStr + '  ' + totalStr + '\n';
    });
    
    commands += '------------------------------------------------\n';
    
    // Totals block
    const formatTotalRow = (label: string, value: string) => {
      const pad = Math.max(1, 48 - label.length - value.length);
      let padStr = '';
      for (let i = 0; i < pad; i++) padStr += ' ';
      return label + padStr + value + '\n';
    };
    
    const currentTotal = Number(sale.totalAmount || 0);
    const paidAmount = Number(sale.amountPaid || 0);
    const addedCredit = Math.max(0, currentTotal - paidAmount);
    const currentCustBal = Number(customerDetails?.balance || 0);
    const prevBal = Math.max(0, currentCustBal - addedCredit);
    const totalBal = currentCustBal > 0 ? currentCustBal : (prevBal + addedCredit);
    
    commands += formatTotalRow('Total Amount :', currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (sale.customerId || isCredit) {
      commands += formatTotalRow('Previous balance :', prevBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      commands += ESC + 'E' + '\x01';
      commands += formatTotalRow('Total balance :', totalBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      commands += ESC + 'E' + '\x00';
    }
    commands += '------------------------------------------------\n';
    
    // Footer
    commands += ESC + 'a' + '\x01';
    const cashierName = ((meData?.user?.firstName || '') + ' ' + (meData?.user?.lastName || '')).trim().toLowerCase() || 'said';
    commands += `You were served by :${cashierName}\n\n`;
    commands += `Goods Once Sold Cannot Be Returned,Thanks.\n\n`;
    commands += `Designed by Starlinkstechnologies LTD 0728 377 16!\n`;
    
    // Cut & Cash Drawer Kick
    commands += '\n\n\n\n';
    commands += GS + 'V' + '\x42' + '\x00';
    commands += ESC + 'p' + '\x00' + '\x19' + '\xfa';
    
    return btoa(unescape(encodeURIComponent(commands)));
  };

  const handlePrint = async () => {
    // 1. Try silent print via agent
    try {
      const agentCheck = await fetch('http://localhost:4000/status', { method: 'GET' });
      if (agentCheck.ok && sale) {
        const printersRes = await fetch('http://localhost:4000/printers');
        const printersData = await printersRes.json();
        const printersList = printersData.printers || [];
        
        let targetPrinter = 'E-POS ECO250';
        if (printersList.length > 0) {
          const match = printersList.find((p: string) => p.toUpperCase().includes('E-POS') || p.toUpperCase().includes('POS'));
          targetPrinter = match || printersList[0];
        }
        
        const rawBase64 = generateEscPosData(sale, meData, customerDetails);
        
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
    const printContent = document.getElementById('printable-receipt');
    if (!printContent) return;

    const originalTitle = document.title;
    if (sale) {
      document.title = `Receipt-CR${sale.id.slice(0, 6).toUpperCase()}`;
    }

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

  // Calculations for preview
  const isCredit = sale ? (sale.paymentMethod === 'CREDIT' || (Number(sale.amountPaid) < Number(sale.totalAmount))) : false;
  const currentTotal = sale ? Number(sale.totalAmount || 0) : 0;
  const paidAmount = sale ? Number(sale.amountPaid || 0) : 0;
  const addedCredit = Math.max(0, currentTotal - paidAmount);
  const currentCustBal = Number(customerDetails?.balance || 0);
  const prevBal = Math.max(0, currentCustBal - addedCredit);
  const totalBal = currentCustBal > 0 ? currentCustBal : (prevBal + addedCredit);

  const invoiceNo = sale ? `CR${sale.id.slice(0, 6).toUpperCase()}` : '';
  const customerNo = customerDetails?.customerNo || (sale?.customerId ? `CUST${sale.customerId.slice(-4).toUpperCase()}` : 'CUST157');
  const customerName = sale ? (sale.customerName || customerDetails?.name || 'NASTEXO').toUpperCase() : '';
  const cashierName = ((meData?.user?.firstName || '') + ' ' + (meData?.user?.lastName || '')).trim().toLowerCase() || 'said';

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
          #printable-receipt {
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
          #printable-receipt * {
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
      <div className="relative w-full max-w-lg bg-[var(--color-bg-base)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--color-border)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">Receipt Preview</h2>
              {sale && (
                <p className="text-xs text-[var(--color-text-muted)] font-mono">#{invoiceNo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sale && getRemainingReturnableQty() > 0 && (
              <button 
                onClick={() => setIsRefundModalOpen(true)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 cursor-pointer no-print"
                title="Refund Items"
              >
                <RefreshCcw size={20} />
              </button>
            )}
            <button 
              onClick={handlePrint}
              disabled={isLoading || !sale}
              className="p-2 text-gray-500 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <LoadingSpinner size="md" />
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Loading receipt...</p>
            </div>
          ) : !sale ? (
            <div className="text-center py-20 text-[var(--color-text-muted)] w-full">
              Receipt not found.
            </div>
          ) : (
            <div id="print-root-wrapper" className="w-full">
              {/* Receipt Roll Container */}
              <div 
                id="printable-receipt" 
                className="relative w-full max-w-[360px] mx-auto bg-white text-gray-900 shadow-lg border border-gray-200/60 flex flex-col"
              >
                {/* Receipt Inner Paper */}
                <div className="px-6 py-6 font-mono text-xs leading-relaxed">
                  
                  {/* Store Header */}
                  <div className="text-center space-y-0.5 mb-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
                      {meData?.business?.name || 'ABU-RAYAN GENERAL STORE'}
                    </h3>
                    <p className="text-[11px] text-gray-700">
                      {meData?.business?.email || 'aburayangenstore@GMAIL.COM'}
                    </p>
                    <p className="text-[11px] text-gray-700">PO.BOX 7180 -300301.</p>
                    <p className="text-[11px] text-gray-700 font-bold">
                      {meData?.business?.phone || '0712 581 995'}
                    </p>
                    <p className="text-[11px] font-extrabold text-gray-900">
                      BUY GOODS : 8477996
                    </p>
                  </div>

                  {/* Receipt Type */}
                  <div className="text-center my-3">
                    <h4 className="text-xs font-extrabold tracking-widest text-gray-900">
                      {isCredit ? 'CREDIT SALES' : 'CASH SALES'}
                    </h4>
                    <div className="text-gray-400 text-[10px]">------------------------------------------------</div>
                  </div>

                  {/* Customer & Invoice Metadata */}
                  <div className="space-y-1 text-[11px] text-gray-900 mb-3">
                    <div className="flex justify-between">
                      <span>Invoice No :</span>
                      <span className="font-bold">{invoiceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer No:</span>
                      <span>{customerNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer Name:</span>
                      <span className="font-bold">{customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date :</span>
                      <span>{format(new Date(sale.soldAt), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time :</span>
                      <span>{format(new Date(sale.soldAt), 'hh:mm:ss a')}</span>
                    </div>
                  </div>

                  {/* Table Header */}
                  <div className="text-gray-400 text-[10px]">------------------------------------------------</div>
                  <div className="flex justify-between text-[11px] font-bold text-gray-900 py-0.5">
                    <span className="w-1/2">Name</span>
                    <span className="w-1/6 text-center">Qnty</span>
                    <span className="w-1/6 text-right">Price</span>
                    <span className="w-1/6 text-right">Total</span>
                  </div>
                  <div className="text-gray-400 text-[10px]">------------------------------------------------</div>

                  {/* Line Items */}
                  <div className="space-y-2.5 my-2">
                    {sale.items?.map((item: any) => {
                      const isGenericVariant = !item.variantName || item.variantName === 'Default' || item.variantName === 'Standard';
                      const displayName = (item.productName 
                        ? `${item.productName}${isGenericVariant ? '' : ` - ${item.variantName}`}`
                        : 'Item').toUpperCase();

                      const qtyNum = Number(item.quantity) || 0;
                      const qtyVal = Number.isInteger(qtyNum) ? qtyNum.toString() : qtyNum.toFixed(2);
                      const qtyStr = `${qtyVal} x ${Number(item.sellingPrice || item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      const totalStr = Number(item.subtotal || item.totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                      return (
                        <div key={item.id} className="text-[11px]">
                          <div className="font-bold text-gray-900">{displayName}</div>
                          <div className="flex justify-between text-gray-800 text-[10px] mt-0.5">
                            <span>{qtyStr}</span>
                            <span className="font-semibold">{totalStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-gray-400 text-[10px]">------------------------------------------------</div>

                  {/* Totals & Credit Balance Summary */}
                  <div className="space-y-1.5 text-[11px] font-medium text-gray-900 my-3">
                    <div className="flex justify-between">
                      <span>Total Amount :</span>
                      <span className="font-bold">{currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {(sale.customerId || isCredit) && (
                      <>
                        <div className="flex justify-between">
                          <span>Previous balance :</span>
                          <span>{prevBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-gray-950 pt-0.5">
                          <span>Total balance :</span>
                          <span>{totalBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-gray-400 text-[10px]">------------------------------------------------</div>

                  {/* Footer */}
                  <div className="text-center space-y-3 mt-4 text-[10px] text-gray-800">
                    <p>You were served by :{cashierName}</p>
                    <p className="font-semibold">Goods Once Sold Cannot Be Returned,Thanks.</p>
                    <p className="text-[9px] text-gray-500 italic">Designed by Starlinkstechnologies LTD 0728 377 16!</p>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isRefundModalOpen && sale && (
        <RefundModal 
          sale={sale} 
          onClose={() => setIsRefundModalOpen(false)} 
        />
      )}
    </div>
  );
}
