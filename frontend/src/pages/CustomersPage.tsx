import { useState, useMemo } from 'react';
import { useCustomers, useDeleteCustomer, useClearAllCustomers, type Customer } from '../features/customers/api/customers.api';
import { Search, Plus, UserCircle, Eye, Pencil, Filter, Upload, Download, Trash2 } from 'lucide-react';
import { CustomerModal } from '../features/customers/components/CustomerModal';
import { CustomerDetailsModal } from '../features/customers/components/CustomerDetailsModal';
import { formatDistanceToNow } from 'date-fns';
import { TableSkeleton } from '../components/ui/Loading';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ImportModal } from '../components/ui/ImportModal';

type TabType = 'all' | 'owing' | 'business' | 'frequent' | 'inactive';

export const CustomersPage = () => {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [owingOnly, setOwingOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToView, setCustomerToView] = useState<Customer | null>(null);

  const handleExportCustomers = async () => {
    try {
      const { data } = await api.get('/export/customers', { responseType: 'text' });
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Customers exported successfully');
    } catch (error) {
      toast.error('Failed to export customers');
    }
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const templateHeaders = ['Name', 'Phone', 'National ID', 'Address', 'Notes', 'Type', 'Amount Owed', 'Period Owed'];
  const sampleRow = ['"John Doe"', '"0712345678"', '"12345678"', '"Nairobi, Kenya"', '"Premium client"', '"INDIVIDUAL"', '"5000"', '"30 to 60 days"'];

  const { data: customersResponse, isLoading, error } = useCustomers({ limit: 1000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const customers: Customer[] = customersResponse?.data || [];

  const { mutateAsync: deleteCustomer } = useDeleteCustomer();
  const { mutateAsync: clearAllCustomers } = useClearAllCustomers();

  const handleDeleteCustomer = async (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      try {
        await deleteCustomer(customer.id);
        toast.success(`Customer "${customer.name}" deleted successfully`);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  const handleClearAllCustomers = async () => {
    if (!customers.length) {
      toast.error('No customers to clear');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ALL ${customers.length} customers? This action cannot be undone.`)) {
      try {
        const res = await clearAllCustomers();
        toast.success(res.message || 'All customer records cleared successfully');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to clear customers');
      }
    }
  };

  // Tab count derivations
  const counts = useMemo(() => {
    const owing = customers.filter(c => Number(c.balance) > 0).length;
    const business = customers.filter(c => c.type === 'BUSINESS').length;
    const frequent = customers.filter(c => (c.purchaseCount || 0) > 10).length;
    const inactive = customers.filter(c => {
      if (c.lastPurchaseDate) {
        const days = (new Date().getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 3600 * 24);
        return days > 60;
      }
      const daysSinceCreated = (new Date().getTime() - new Date(c.createdAt).getTime()) / (1000 * 3600 * 24);
      return daysSinceCreated > 60;
    }).length;

    return {
      all: customers.length,
      owing,
      business,
      frequent,
      inactive
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (customer.phone && customer.phone.includes(searchTerm));
      const matchesOwingToggle = owingOnly ? Number(customer.balance) > 0 : true;
      
      let matchesTab = true;
      if (activeTab === 'owing') {
        matchesTab = Number(customer.balance) > 0;
      } else if (activeTab === 'business') {
        matchesTab = customer.type === 'BUSINESS';
      } else if (activeTab === 'frequent') {
        matchesTab = (customer.purchaseCount || 0) > 10;
      } else if (activeTab === 'inactive') {
        if (customer.lastPurchaseDate) {
          const days = (new Date().getTime() - new Date(customer.lastPurchaseDate).getTime()) / (1000 * 3600 * 24);
          matchesTab = days > 60;
        } else {
          const daysSinceCreated = (new Date().getTime() - new Date(customer.createdAt).getTime()) / (1000 * 3600 * 24);
          matchesTab = daysSinceCreated > 60;
        }
      }
      
      return matchesSearch && matchesOwingToggle && matchesTab;
    });
  }, [customers, searchTerm, owingOnly, activeTab]);

  const totalCustomers = customers.length;
  const outstandingDebt = customers.reduce((sum, c) => sum + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
  
  const overdueDebt = customers.reduce((sum, c) => {
    if (Number(c.balance) > 0 && c.lastPurchaseDate) {
      const daysSincePurchase = (new Date().getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 3600 * 24);
      if (daysSincePurchase > 30) {
        return sum + Number(c.balance);
      }
    }
    return sum;
  }, 0);

  const getAvatarStyle = (name: string) => {
    const colors = [
      { bg: 'bg-amber-100', text: 'text-amber-800' },
      { bg: 'bg-blue-100', text: 'text-blue-800' },
      { bg: 'bg-green-100', text: 'text-green-800' },
      { bg: 'bg-pink-100', text: 'text-pink-800' }
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getStatus = (balance: number, purchaseCount: number = 0, lastPurchaseDate?: string) => {
    if (balance > 0) {
      if (lastPurchaseDate) {
        const daysSincePurchase = (new Date().getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 3600 * 24);
        if (daysSincePurchase > 30) {
          return { label: 'Overdue', className: 'bg-red-100 text-red-700' };
        }
      }
      return { label: 'Owing', className: 'bg-amber-100 text-amber-700' };
    }
    if (purchaseCount > 10) {
      return { label: 'Frequent', className: 'bg-purple-100 text-purple-700' };
    }
    if (purchaseCount > 0) {
      return { label: 'Clear', className: 'bg-green-100 text-green-700' };
    }
    return { label: 'Registered', className: 'bg-gray-100 text-gray-500' };
  };

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return 'No purchases yet';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const handleOpenAddModal = () => {
    setCustomerToEdit(null);
    setIsModalOpen(true);
  };

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'owing', label: 'Owing balance', count: counts.owing },
    { id: 'business', label: 'Business accounts', count: counts.business },
    { id: 'frequent', label: 'Frequent buyers', count: counts.frequent },
    { id: 'inactive', label: 'Inactive', count: counts.inactive },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto h-full flex flex-col w-full space-y-4 md:space-y-6">
      
      {/* Top Section */}
      <div className="flex flex-col gap-3 md:gap-4">
        {/* Toolbar Row */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full">
          <div className="flex flex-row gap-2 w-full xl:w-auto xl:flex-1">
            <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm placeholder:text-[var(--color-text-muted)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
            />
          </div>
          
            <button
              onClick={() => setOwingOnly(!owingOnly)}
              className={`h-10 px-3 sm:px-4 rounded-[var(--radius-md)] text-xs sm:text-sm transition-all border shrink-0 select-none cursor-pointer font-medium whitespace-nowrap ${
                owingOnly 
                  ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)]/30 text-[var(--color-accent-hover)]' 
                  : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)]'
              }`}
            >
              Owing only
            </button>
          </div>

          <div className="flex flex-row gap-2 w-full xl:w-auto shrink-0">
            {currentUser?.role !== 'CASHIER' && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-3 sm:px-4 h-10 rounded-[var(--radius-md)] font-semibold text-xs sm:text-sm transition-all shrink-0 select-none cursor-pointer"
              >
                <Download size={16} className="w-4 h-4" />
                <span>Import</span>
              </button>
            )}

            <button
              onClick={handleExportCustomers}
              className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 sm:px-4 h-10 rounded-[var(--radius-md)] font-semibold text-xs sm:text-sm transition-all shrink-0 select-none cursor-pointer"
            >
              <Upload size={16} className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 sm:px-5 h-10 rounded-[var(--radius-md)] font-semibold text-xs sm:text-sm transition-all shrink-0 cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Filter Tab Bar */}
        <div className="flex items-center border-b border-[var(--color-border)] overflow-x-auto hide-scrollbar w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm border-b-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab.label}
              <span 
                className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.id 
                    ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-hover)]' 
                    : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      <div className="flex-1 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] w-[28%] bg-white sticky top-0 z-10">Customer</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] w-[10%] bg-white sticky top-0 z-10">Type</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] w-[15%] bg-white sticky top-0 z-10">Balance</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] w-[12%] bg-white sticky top-0 z-10">Purchases</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] w-[15%] bg-white sticky top-0 z-10">Last seen</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] w-[10%] bg-white sticky top-0 z-10">Status</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] w-[72px] text-right bg-white sticky top-0 z-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={5} cols={7} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="h-32 text-center text-sm text-[var(--color-danger)]">Failed to load customers</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-64">
                    {customers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <UserCircle className="w-11 h-11 text-[var(--color-text-muted)] mb-3" />
                        <h4 className="text-base font-medium text-[var(--color-text-secondary)] mb-1">No customers yet</h4>
                        <p className="text-sm text-[var(--color-text-muted)] mb-4">Add a customer to track credit sales and purchase history.</p>
                        <button 
                          onClick={handleOpenAddModal}
                          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 h-10 rounded-[var(--radius-md)] font-semibold text-sm transition-all shadow-sm cursor-pointer"
                        >
                          + Add Customer
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Filter className="w-11 h-11 text-[var(--color-text-muted)] mb-3" />
                        <h4 className="text-base font-medium text-[var(--color-text-secondary)] mb-1">No customers match this filter</h4>
                        <p className="text-sm text-[var(--color-text-muted)]">Try adjusting your search or filter.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, index) => {
                  const balance = Number(customer.balance);
                  const purchaseCount = customer.purchaseCount || 0;
                  const avatarStyle = getAvatarStyle(customer.name);
                  const status = getStatus(balance, purchaseCount, customer.lastPurchaseDate);
                  const initials = customer.name.substring(0, 2).toUpperCase();
                  const isLastRow = index === filteredCustomers.length - 1;

                  return (
                    <tr 
                      key={customer.id} 
                      className={`hover:bg-[var(--color-bg-base)] transition-colors ${isLastRow ? '' : 'border-b border-[var(--color-border)]'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${avatarStyle.bg} ${avatarStyle.text}`}>
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{customer.name}</span>
                            {customer.phone && (
                              <span className="text-xs text-[var(--color-text-muted)]">{customer.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          customer.type === 'BUSINESS' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]'
                        }`}>
                          {customer.type === 'BUSINESS' ? 'Business' : 'Individual'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start">
                          <span className={`text-sm ${balance > 0 ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-text-muted)]'}`}>
                            KSH {balance.toLocaleString()}
                          </span>
                          {balance > 0 && customer.periodOwed && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium border border-amber-200/60 mt-0.5 whitespace-nowrap">
                              {customer.periodOwed}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${purchaseCount > 0 ? 'text-[var(--color-text-secondary)] font-medium' : 'text-[var(--color-text-muted)]'}`}>
                          {purchaseCount > 0 ? purchaseCount : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${customer.lastPurchaseDate ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'}`}>
                          {getRelativeTime(customer.lastPurchaseDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors rounded cursor-pointer" 
                            title="View details" 
                            onClick={() => setCustomerToView(customer)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1 text-gray-400 hover:text-[#D97706] transition-colors rounded cursor-pointer" 
                            title="Edit customer"
                            onClick={() => {
                              setCustomerToEdit(customer);
                              setIsModalOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {currentUser?.role === 'OWNER' && (
                            <button 
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded cursor-pointer" 
                              title="Delete customer"
                              onClick={() => handleDeleteCustomer(customer)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        customerToEdit={customerToEdit}
      />
      
      {(() => {
        const activeCustomer = customerToView ? (customers.find(c => c.id === customerToView.id) || customerToView) : null;
        return (
          <CustomerDetailsModal
            isOpen={!!customerToView}
            onClose={() => setCustomerToView(null)}
            customer={activeCustomer}
          />
        );
      })()}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Customers"
        templateHeaders={templateHeaders}
        sampleRow={sampleRow}
        importUrl="/import/customers"
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};
