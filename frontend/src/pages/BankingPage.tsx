import React, { useState, useMemo, useEffect } from 'react';
import {
  useBankingCustomers,
  useBankingLedger,
  useUpdateBankingCustomer,
  useDeleteBankingCustomer,
  useProcessBankingTransaction
} from '../features/banking/api/banking.api';
import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  User,
  Landmark,
  Loader2,
  Plus,
  Upload,
  Save,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { BankingCustomerModal } from '../features/banking/components/BankingCustomerModal';
import { ImportModal } from '../components/ui/ImportModal';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const BankingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Editable Bio Data Form state for selected customer
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formIdNumber, setFormIdNumber] = useState('');

  // Transaction Inputs
  const [transAmount, setTransAmount] = useState('');

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: responseData, isLoading: customersLoading } = useBankingCustomers();
  const customers = responseData?.customers || [];
  const totalBalance = responseData?.totalBalance || '0.00';

  const updateCustomerMutation = useUpdateBankingCustomer();
  const deleteCustomerMutation = useDeleteBankingCustomer();
  const processTransactionMutation = useProcessBankingTransaction();

  // Auto select first customer if none selected
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Sync form inputs when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setFormCode(selectedCustomer.code || '');
      setFormName(selectedCustomer.name || '');
      setFormPhone(selectedCustomer.phone || '');
      setFormIdNumber(selectedCustomer.idNumber || '');
    } else {
      setFormCode('');
      setFormName('');
      setFormPhone('');
      setFormIdNumber('');
    }
  }, [selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        (c.code && c.code.toLowerCase().includes(lowerSearch)) ||
        (c.phone && c.phone.includes(lowerSearch)) ||
        (c.idNumber && c.idNumber.toLowerCase().includes(lowerSearch))
    );
  }, [customers, searchTerm]);

  const { data: ledgerEntry, isLoading: ledgerLoading } = useBankingLedger(selectedCustomerId);
  const ledger = ledgerEntry?.transactions || [];

  const formatKES = (amount: number | string) => {
    const num = Number(amount);
    return num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    if (!formName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    try {
      await updateCustomerMutation.mutateAsync({
        id: selectedCustomer.id,
        data: {
          code: formCode.trim() || undefined,
          name: formName.trim(),
          phone: formPhone.trim() || undefined,
          idNumber: formIdNumber.trim() || undefined,
        },
      });
      toast.success('Customer details updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Are you sure you want to delete banking account for "${selectedCustomer.name}"?`)) {
      return;
    }
    try {
      await deleteCustomerMutation.mutateAsync(selectedCustomer.id);
      toast.success('Banking customer deleted');
      setSelectedCustomerId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleExecuteTransaction = async (typeToUse: 'DEPOSIT' | 'WITHDRAWAL') => {
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }
    const amountVal = Number(transAmount);
    if (!transAmount || isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    try {
      await processTransactionMutation.mutateAsync({
        id: selectedCustomer.id,
        data: {
          type: typeToUse,
          amount: amountVal,
        },
      });
      toast.success(`${typeToUse === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} of KES ${formatKES(amountVal)} processed`);
      setTransAmount('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process transaction');
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-gray-100">
      {/* Left Sidebar - Bio Data Account List */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-300 flex flex-col h-[40vh] md:h-full shrink-0 shadow-sm">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-800 text-sm tracking-wide uppercase flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-blue-600" /> Bio Data
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setImportModalOpen(true)}
                className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Import Accounts"
              >
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
              <button
                onClick={() => setCustomerModalOpen(true)}
                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Add New Account"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Code, Name, Phone, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Customer Accounts Table */}
        <div className="flex-1 overflow-y-auto">
          {customersLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center p-8 text-xs text-gray-500">No banking accounts found</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-200 text-gray-700 font-bold border-b border-gray-300">
                <tr>
                  <th className="py-2 px-2.5 w-20">Code</th>
                  <th className="py-2 px-2.5">Name</th>
                  <th className="py-2 px-2.5 text-right w-24">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((c) => {
                  const bal = Number(c.balance);
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-100 font-semibold text-blue-900' : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <td className="py-2 px-2.5 font-mono text-[11px] text-gray-600">{c.code || 'N/A'}</td>
                      <td className="py-2 px-2.5 truncate max-w-[140px]" title={c.name}>
                        {c.name}
                      </td>
                      <td
                        className={`py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap ${
                          bal > 0 ? 'text-green-700' : bal < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {formatKES(bal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Total Balance Footer */}
        <div className="p-3 border-t border-gray-300 bg-gray-100 flex justify-between items-center text-xs">
          <span className="font-bold text-gray-700 uppercase tracking-wide">Total Balance</span>
          <span className="font-mono font-black text-sm text-gray-900">KES {formatKES(totalBalance)}</span>
        </div>
      </div>

      {/* Right Main Content */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-full overflow-hidden">
        {!selectedCustomer ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <User className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm">Select an account from the left list to manage banking details</p>
          </div>
        ) : (
          <>
            {/* Top Form Section - Selected Account Bio & Transaction Control */}
            <div className="bg-white border-b border-gray-300 p-4 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Bank Details Inputs (Left 8 Cols) */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Bank Account Details</h3>
                    <span className="text-xs text-gray-500 font-mono">ID: {selectedCustomer.id.substring(0, 8)}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Code</label>
                      <input
                        type="text"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs font-mono font-bold text-gray-800 focus:bg-white focus:ring-1 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Name</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs font-semibold text-gray-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Phone</label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Id No.</label>
                      <input
                        type="text"
                        value={formIdNumber}
                        onChange={(e) => setFormIdNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Transaction Amount Input */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Amount (KES)</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Enter amount..."
                      value={transAmount}
                      onChange={(e) => setTransAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-400 rounded text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Big Balance Box & Action Buttons (Right 4 Cols) */}
                <div className="lg:col-span-4 flex flex-col justify-between gap-3 h-full">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Running Balance</label>
                    <div 
                      className="w-full p-3 text-white rounded shadow-inner flex flex-col justify-center"
                      style={{ backgroundColor: '#000000', opacity: 1 }}
                    >
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                        {Number(selectedCustomer.balance) >= 0 ? 'Customer Owed' : 'Customer Owes'}
                      </span>
                      <span
                        className="text-2xl font-mono font-black tracking-tight"
                        style={{ color: '#16a34a' }}
                      >
                        KES {formatKES(selectedCustomer.balance)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveCustomer}
                      disabled={updateCustomerMutation.isPending}
                      className="px-3 py-1.5 bg-gray-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: '#374151', color: '#ffffff', opacity: 1 }}
                      title="Save Customer Details"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteCustomer}
                      disabled={deleteCustomerMutation.isPending}
                      className="px-3 py-1.5 bg-red-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: '#b91c1c', color: '#ffffff', opacity: 1 }}
                      title="Delete Customer Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteTransaction('DEPOSIT')}
                      disabled={processTransactionMutation.isPending}
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        opacity: 1,
                        cursor: 'pointer'
                      }}
                      className="px-3 py-2 text-white rounded font-bold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                      title="Deposit Money"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Deposit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteTransaction('WITHDRAWAL')}
                      disabled={processTransactionMutation.isPending}
                      style={{
                        backgroundColor: '#1f2937',
                        color: '#ffffff',
                        opacity: 1,
                        cursor: 'pointer'
                      }}
                      className="px-3 py-2 text-white rounded font-bold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                      title="Withdraw Money"
                    >
                      <ArrowUpFromLine className="w-3.5 h-3.5" /> Withdraw
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Transaction Ledger Table */}
            <div className="flex-1 p-3 overflow-y-auto bg-gray-100">
              <div className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-2.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Transaction History for {selectedCustomer.name} ({selectedCustomer.code || 'N/A'})
                  </span>
                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['bankingLedger', selectedCustomer.id] })}
                    className="p-1 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                    title="Refresh Ledger"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-gray-200 text-gray-700 font-bold border-b border-gray-300">
                      <tr>
                        <th className="py-2 px-3 w-32">Date</th>
                        <th className="py-2 px-3 w-24">TransNo</th>
                        <th className="py-2 px-3 text-right">Deposit</th>
                        <th className="py-2 px-3 text-right">Withdraw</th>
                        <th className="py-2 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono">
                      {ledgerLoading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            <div className="flex justify-center items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading transaction history...
                            </div>
                          </td>
                        </tr>
                      ) : ledger.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                            No transactions recorded for this account.
                          </td>
                        </tr>
                      ) : (
                        ledger.map((tx) => {
                          const dep = Number(tx.depositAmount || (tx.type === 'DEPOSIT' ? tx.amount : 0));
                          const wd = Number(tx.withdrawAmount || (tx.type === 'WITHDRAWAL' ? tx.amount : 0));
                          const bal = Number(tx.balanceAfter);

                          return (
                            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-3 whitespace-nowrap text-gray-700 font-sans">
                                {format(new Date(tx.createdAt), 'dd/MM/yyyy')}
                              </td>
                              <td className="py-2 px-3 font-bold text-gray-800">{tx.transNo || '-'}</td>
                              <td className="py-2 px-3 text-right font-bold text-green-700">
                                {dep > 0 ? formatKES(dep) : '0.00'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">
                                {wd > 0 ? formatKES(wd) : '0.00'}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-bold ${
                                  bal >= 0 ? 'text-gray-900' : 'text-red-600'
                                }`}
                              >
                                {formatKES(bal)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <BankingCustomerModal isOpen={customerModalOpen} onClose={() => setCustomerModalOpen(false)} />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Banking Customers"
        templateHeaders={['Code', 'Name', 'Phone', 'IdNumber', 'Balance']}
        sampleRow={['BK001', 'John Doe', '0700000000', '12345678', '5000']}
        importUrl="/banking/customers/import"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['bankingCustomers'] });
          setImportModalOpen(false);
        }}
      />
    </div>
  );
};
