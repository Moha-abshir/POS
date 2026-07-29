import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi, useCustomerLedger } from '../features/customers/api/customers.api';
import { Search, ArrowDownToLine, ArrowUpFromLine, User, Landmark, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { BankingTransactionModal } from '../features/banking/components/BankingTransactionModal';

export const BankingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; type: 'DEPOSIT' | 'WITHDRAWAL' | null }>({ isOpen: false, type: null });

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getCustomers({ limit: 1000 }),
  });

  const customers = customersData?.data || [];
  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter((c: any) => 
      c.name.toLowerCase().includes(lowerSearch) || 
      (c.phone && c.phone.includes(lowerSearch))
    );
  }, [customers, searchTerm]);

  const { data: ledger, isLoading: ledgerLoading } = useCustomerLedger(selectedCustomerId || undefined);

  const formatKES = (amount: number) => {
    return amount.toLocaleString('en-KE', { style: 'currency', currency: 'KES' });
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left Sidebar - Customer List */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-[var(--color-border)] flex flex-col h-[40vh] md:h-full shrink-0">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[var(--color-accent)]" />
            Banking Ledger
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
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
            <div className="text-center p-8 text-sm text-gray-500">No customers found</div>
          ) : (
            <div className="space-y-1">
              {filteredCustomers.map((customer: any) => (
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
                    <p className={`text-sm font-bold ${Number(customer.balance) > 0 ? 'text-[var(--color-danger)]' : Number(customer.balance) < 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>
                      {formatKES(Number(customer.balance))}
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
            <p className="text-lg">Select a customer to view their ledger</p>
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
                  <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Current Balance</p>
                  <p className={`text-3xl font-black ${Number(selectedCustomer.balance) > 0 ? 'text-[var(--color-danger)]' : Number(selectedCustomer.balance) < 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>
                    {formatKES(Number(selectedCustomer.balance))}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setTransactionModal({ isOpen: true, type: 'WITHDRAWAL' })}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-[var(--radius-md)] font-semibold text-sm transition-colors"
                  >
                    <ArrowUpFromLine className="w-4 h-4" /> Withdraw (Loan)
                  </button>
                  <button
                    onClick={() => setTransactionModal({ isOpen: true, type: 'DEPOSIT' })}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-success)] text-white hover:bg-green-700 rounded-[var(--radius-md)] font-semibold text-sm transition-colors"
                  >
                    <ArrowDownToLine className="w-4 h-4" /> Deposit (Pay)
                  </button>
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
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)]">Trans No</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)]">Notes</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)] text-right">Loan</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)] text-right">Payment</th>
                        <th className="px-6 py-4 font-semibold border-b border-[var(--color-border)] text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-[var(--color-border)]">
                      {ledgerLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)] mx-auto" /></td>
                        </tr>
                      ) : !ledger || ledger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions recorded yet.</td>
                        </tr>
                      ) : (
                        ledger.map((entry: any) => (
                          <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-gray-900 whitespace-nowrap">{format(new Date(entry.date), 'dd/MM/yyyy HH:mm')}</td>
                            <td className="px-6 py-4 font-mono text-gray-500">{entry.transNo}</td>
                            <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]">{entry.notes}</td>
                            <td className="px-6 py-4 text-right font-medium text-red-600">{entry.loan > 0 ? formatKES(entry.loan) : '-'}</td>
                            <td className="px-6 py-4 text-right font-medium text-green-600">{entry.payment > 0 ? formatKES(entry.payment) : '-'}</td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatKES(entry.runningBalance)}</td>
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

      {transactionModal.isOpen && selectedCustomer && (
        <BankingTransactionModal
          customer={selectedCustomer}
          type={transactionModal.type!}
          onClose={() => setTransactionModal({ isOpen: false, type: null })}
        />
      )}
    </div>
  );
};
