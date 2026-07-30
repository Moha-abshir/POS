import React, { useState, useMemo } from 'react';
import { useBankingCustomers, useBankingLedger } from '../features/banking/api/banking.api';
import { Search, ArrowDownToLine, ArrowUpFromLine, User, Landmark, Loader2, Plus, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { BankingTransactionModal } from '../features/banking/components/BankingTransactionModal';
import { BankingCustomerModal } from '../features/banking/components/BankingCustomerModal';
import { ImportModal } from '../components/ui/ImportModal';
import { useQueryClient } from '@tanstack/react-query';

export const BankingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BANKER' | 'LOAN_CLIENT'>('BANKER');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; type: 'DEPOSIT' | 'WITHDRAWAL' | 'LOAN_ISSUED' | 'LOAN_REPAYMENT' | null }>({ isOpen: false, type: null });
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: customersLoading } = useBankingCustomers(activeTab);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter((c) => 
      c.name.toLowerCase().includes(lowerSearch) || 
      (c.phone && c.phone.includes(lowerSearch))
    );
  }, [customers, searchTerm]);

  const { data: ledgerEntry, isLoading: ledgerLoading } = useBankingLedger(selectedCustomerId);
  const ledger = ledgerEntry?.transactions || [];

  const formatKES = (amount: number | string) => {
    return Number(amount).toLocaleString('en-KE', { style: 'currency', currency: 'KES' });
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left Sidebar - Customer List */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-[var(--color-border)] flex flex-col h-[40vh] md:h-full shrink-0">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[var(--color-accent)]" />
              Banking
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportModalOpen(true)}
                className="p-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                title="Import"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCustomerModalOpen(true)}
                className="p-1.5 bg-[var(--color-accent)] text-white rounded-md hover:bg-[var(--color-accent-hover)] transition-colors"
                title="Add New"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </h2>

          {/* Tabs */}
          <div className="flex rounded-md bg-[var(--color-bg-sunken)] p-1 mb-4">
            <button
              onClick={() => { setActiveTab('BANKER'); setSelectedCustomerId(null); }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded ${activeTab === 'BANKER' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Bankers
            </button>
            <button
              onClick={() => { setActiveTab('LOAN_CLIENT'); setSelectedCustomerId(null); }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded ${activeTab === 'LOAN_CLIENT' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Loans
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {customersLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center p-8 text-sm text-gray-500">No records found</div>
          ) : (
            <div className="space-y-1">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full text-left p-3 rounded-[var(--radius-md)] transition-colors flex justify-between items-center ${
                    selectedCustomerId === customer.id 
                      ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-accent)]' 
                      : 'hover:bg-[var(--color-bg-sunken)] border border-transparent'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold text-[var(--color-text-primary)] truncate text-sm">{customer.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{customer.phone || 'No phone'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${Number(customer.balance) > 0 ? 'text-[var(--color-success)]' : Number(customer.balance) < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
                      {formatKES(customer.balance)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Ledger Details */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-full bg-[var(--color-bg-base)]">
        {!selectedCustomer ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <User className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Select a record to view details</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white p-6 border-b border-[var(--color-border)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{selectedCustomer.name}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="bg-[var(--color-bg-sunken)] px-2 py-1 rounded">Code: {selectedCustomer.id.substring(0,8).toUpperCase()}</span>
                  <span>{selectedCustomer.phone}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Balance</p>
                  <p className={`text-3xl font-black ${Number(selectedCustomer.balance) > 0 ? 'text-[var(--color-success)]' : Number(selectedCustomer.balance) < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
                    {formatKES(selectedCustomer.balance)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {activeTab === 'BANKER' ? (
                    <>
                      <button
                        onClick={() => setTransactionModal({ isOpen: true, type: 'DEPOSIT' })}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-success)] text-white hover:bg-green-700 rounded-[var(--radius-md)] font-semibold text-sm transition-colors"
                      >
                        <ArrowDownToLine className="w-4 h-4" /> Deposit
                      </button>
                      <button
                        onClick={() => setTransactionModal({ isOpen: true, type: 'WITHDRAWAL' })}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-[var(--radius-md)] font-semibold text-sm transition-colors"
                      >
                        <ArrowUpFromLine className="w-4 h-4" /> Withdraw
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setTransactionModal({ isOpen: true, type: 'LOAN_REPAYMENT' })}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-success)] text-white hover:bg-green-700 rounded-[var(--radius-md)] font-semibold text-sm transition-colors"
                      >
                        <ArrowDownToLine className="w-4 h-4" /> Pay Loan
                      </button>
                      <button
                        onClick={() => setTransactionModal({ isOpen: true, type: 'LOAN_ISSUED' })}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-[var(--radius-md)] font-semibold text-sm transition-colors"
                      >
                        <ArrowUpFromLine className="w-4 h-4" /> Issue Loan
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ledger Grid */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)]">Date</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)]">Type</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)]">Notes</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)] text-right">Amount</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)] text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-[var(--color-border)]">
                      {ledgerLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
                            <div className="flex justify-center items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" /> Loading ledger...
                            </div>
                          </td>
                        </tr>
                      ) : ledger.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
                            No transactions found for this customer.
                          </td>
                        </tr>
                      ) : (
                        ledger.map((entry) => (
                          <tr key={entry.id} className="hover:bg-[var(--color-bg-sunken)] transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-[var(--color-text-primary)]">
                              {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                ['DEPOSIT', 'LOAN_REPAYMENT'].includes(entry.type)
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {entry.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                              {entry.notes || '-'}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-[var(--color-text-primary)]">
                              {formatKES(entry.amount)}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-bold text-[var(--color-text-primary)]">
                              {formatKES(entry.balanceAfter)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {transactionModal.isOpen && transactionModal.type && selectedCustomer && (
        <BankingTransactionModal
          customer={selectedCustomer}
          type={transactionModal.type}
          onClose={() => setTransactionModal({ isOpen: false, type: null })}
        />
      )}

      <BankingCustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        type={activeTab}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Banking Customers"
        templateHeaders={['Name', 'Phone', 'Type', 'Balance']}
        sampleRow={['John Doe', '0700000000', 'BANKER', '5000']}
        importUrl="/banking/customers/import"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['bankingCustomers'] });
          setImportModalOpen(false);
        }}
      />
    </div>
  );
};

