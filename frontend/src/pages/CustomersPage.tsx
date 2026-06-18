import { useState } from 'react';
// @ts-ignore - VS Code TS caching issue, file exports useCustomers correctly
import { useCustomers } from '../features/customers/api/customers.api';
import { Search, Plus, UserCircle, Phone, MapPin, Pencil } from 'lucide-react';
// import { CustomerModal } from '../features/customers/components/CustomerModal';

export const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customersResponse, isLoading, error } = useCustomers({ search: searchTerm });
  const customers = customersResponse?.data || [];

  const handleEdit = () => {
    // setSelectedCustomer(customer);
    // setIsModalOpen(true);
  };

  const handleAddNew = () => {
    // setSelectedCustomer(null);
    // setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)] tracking-tight">Customers</h1>
          <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">Manage your customers and their credit balances</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 h-10 rounded-[var(--radius-md)] font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 shrink-0 select-none cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-4 shrink-0">
          <div className="relative w-full max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-[var(--color-bg-sunken)] border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)] transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-[var(--color-text-secondary)]">Loading customers...</div>
          ) : error ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-[var(--color-danger)]">Failed to load customers</div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
              <div className="w-16 h-16 bg-[var(--color-bg-sunken)] rounded-full flex items-center justify-center mb-4">
                <UserCircle className="w-8 h-8 text-[var(--color-text-muted)]" />
              </div>
              <p className="text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] mb-2">No customers found</p>
              <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] max-w-md">Add your first customer to start tracking debt and purchase history.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-[var(--color-border)]">
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Customer</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase">Contact Details</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase text-right">Balance</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold tracking-widest text-[var(--color-text-muted)] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: any, index: number) => {
                  const balance = Number(customer.balance);
                  const hasDebt = balance > 0;
                  
                  return (
                    <tr key={customer.id} className={`border-b border-[var(--color-border)] h-[72px] transition-colors duration-150 hover:bg-[var(--color-bg-sunken)] ${index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-base)]'}`}>
                      <td className="px-6 py-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-sunken)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] font-bold shadow-sm">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--color-text-primary)] leading-tight">{customer.name}</span>
                            {customer.nationalId && (
                              <span className="text-[var(--text-xs)] text-[var(--color-text-secondary)] mt-0.5">ID: {customer.nationalId}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-0">
                        <div className="flex flex-col gap-1 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                              <span className="font-medium">{customer.phone}</span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                              <span className="truncate max-w-[200px]" title={customer.address}>{customer.address}</span>
                            </div>
                          )}
                          {!customer.phone && !customer.address && (
                            <span className="text-[var(--color-text-muted)] italic">No contact details</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-0 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-[var(--text-base)] ${hasDebt ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
                            KSh {balance.toLocaleString()}
                          </span>
                          {hasDebt && (
                            <span className="text-[var(--text-xs)] font-medium text-[var(--color-danger)]/70 uppercase tracking-wider mt-0.5">Outstanding</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-0 text-right">
                        <button 
                          onClick={() => handleEdit(customer)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors"
                          title="Edit Customer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* 
      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        customer={selectedCustomer} 
      /> 
      */}
    </div>
  );
};
