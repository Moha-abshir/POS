import { useState, useMemo } from 'react';
import { useCustomers, type Customer } from '../features/customers/api/customers.api';
import { Search, Plus, UserCircle, Eye, Pencil, Filter } from 'lucide-react';
import { CustomerModal } from '../features/customers/components/CustomerModal';
import { CustomerDetailsModal } from '../features/customers/components/CustomerDetailsModal';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'all' | 'owing' | 'business' | 'frequent' | 'inactive';

export const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [owingOnly, setOwingOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToView, setCustomerToView] = useState<Customer | null>(null);

  const { data: customersResponse, isLoading, error } = useCustomers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const customers: Customer[] = customersResponse?.data || [];

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
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col w-full space-y-6">
      
      {/* Top Section */}
      <div className="flex flex-col gap-4">
        {/* Toolbar Row */}
        <div className="flex items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-white border border-[#E5E1DA] rounded-lg text-sm placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
          </div>
          
          <button
            onClick={() => setOwingOnly(!owingOnly)}
            className={`h-9 px-4 rounded-lg text-sm transition-colors border shrink-0 select-none cursor-pointer ${
              owingOnly 
                ? 'bg-amber-50 border-amber-300 text-amber-700' 
                : 'bg-white border-[#E5E1DA] text-gray-600 hover:bg-gray-50'
            }`}
          >
            Owing only
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-[#D97706] hover:bg-[#B45309] text-white px-4 h-9 rounded-lg font-medium text-sm transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>

        {/* Filter Tab Bar */}
        <div className="flex items-center border-b border-[#E5E1DA]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#D97706] text-[#D97706] font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span 
                className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        <div className="bg-white border border-[#E5E1DA] rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Total customers</h3>
          <p className="text-2xl font-medium text-gray-900">{totalCustomers}</p>
        </div>
        <div className="bg-white border border-[#E5E1DA] rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Outstanding debt</h3>
          <p className={`text-2xl font-medium ${outstandingDebt > 0 ? 'text-[#D97706]' : 'text-gray-900'}`}>
            KSH {outstandingDebt.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-[#E5E1DA] rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Overdue (&gt;30 days)</h3>
          <p className={`text-2xl font-medium ${overdueDebt > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            KSH {overdueDebt.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Customer Table */}
      <div className="flex-1 bg-white border border-[#E5E1DA] rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-gray-400 border-b border-[#E5E1DA] w-[28%] bg-white sticky top-0 z-10">Customer</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-gray-400 border-b border-[#E5E1DA] w-[10%] bg-white sticky top-0 z-10">Type</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-gray-400 border-b border-[#E5E1DA] w-[15%] bg-white sticky top-0 z-10">Balance</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-gray-400 border-b border-[#E5E1DA] w-[12%] bg-white sticky top-0 z-10">Purchases</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-gray-400 border-b border-[#E5E1DA] w-[15%] bg-white sticky top-0 z-10">Last seen</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-gray-400 border-b border-[#E5E1DA] w-[10%] bg-white sticky top-0 z-10">Status</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-gray-400 border-b border-[#E5E1DA] w-[72px] text-right bg-white sticky top-0 z-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="h-32 text-center text-sm text-gray-500">Loading customers...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="h-32 text-center text-sm text-red-500">Failed to load customers</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-64">
                    {customers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <UserCircle className="w-11 h-11 text-gray-300 mb-3" />
                        <h4 className="text-base font-medium text-gray-500 mb-1">No customers yet</h4>
                        <p className="text-sm text-gray-400 mb-4">Add a customer to track credit sales and purchase history.</p>
                        <button 
                          onClick={handleOpenAddModal}
                          className="bg-[#D97706] hover:bg-[#B45309] text-white px-4 h-9 rounded-lg font-medium text-sm transition-colors"
                        >
                          + Add Customer
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Filter className="w-11 h-11 text-gray-300 mb-3" />
                        <h4 className="text-base font-medium text-gray-500 mb-1">No customers match this filter</h4>
                        <p className="text-sm text-gray-400">Try adjusting your search or filter.</p>
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
                      className={`hover:bg-[#F7F6F4] transition-colors ${isLastRow ? '' : 'border-b border-[#F0EDE8]'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${avatarStyle.bg} ${avatarStyle.text}`}>
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                            {customer.phone && (
                              <span className="text-xs text-gray-400">{customer.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          customer.type === 'BUSINESS' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {customer.type === 'BUSINESS' ? 'Business' : 'Individual'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${balance > 0 ? 'text-[#D97706] font-medium' : 'text-gray-400'}`}>
                          KSH {balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${purchaseCount > 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                          {purchaseCount > 0 ? purchaseCount : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${customer.lastPurchaseDate ? 'text-gray-500' : 'text-gray-400'}`}>
                          {getRelativeTime(customer.lastPurchaseDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            className="p-1 text-gray-400 hover:text-[#D97706] transition-colors rounded" 
                            title="View details" 
                            onClick={() => setCustomerToView(customer)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1 text-gray-400 hover:text-[#D97706] transition-colors rounded" 
                            title="Edit customer"
                            onClick={() => {
                              setCustomerToEdit(customer);
                              setIsModalOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
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
      
      <CustomerDetailsModal
        isOpen={!!customerToView}
        onClose={() => setCustomerToView(null)}
        customer={customerToView}
      />
    </div>
  );
};
