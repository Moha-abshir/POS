import { useState, useMemo } from 'react';
// @ts-ignore - VS Code TS caching issue
import { useCustomers, type Customer } from '../features/customers/api/customers.api';
import { Search, Plus, UserCircle, Eye, Pencil } from 'lucide-react';
import { CustomerModal } from '../features/customers/components/CustomerModal';

export const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [owingOnly, setOwingOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: customersResponse, isLoading, error } = useCustomers();
  const allCustomers: Customer[] = customersResponse?.data || [];

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.phone && c.phone.includes(searchTerm));
      const matchesOwing = owingOnly ? Number(c.balance) > 0 : true;
      return matchesSearch && matchesOwing;
    });
  }, [allCustomers, searchTerm, owingOnly]);

  const totalCustomers = allCustomers.length;
  
  const outstandingDebt = allCustomers.reduce((sum, c) => sum + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
  
  const overdueDebt = allCustomers.reduce((sum, c) => {
    if (Number(c.balance) > 0 && c.lastPurchaseDate) {
      const diffDays = Math.floor((new Date().getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) return sum + Number(c.balance);
    }
    return sum;
  }, 0);

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return 'No purchases yet';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return '1 month ago';
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getAvatarStyle = (name: string) => {
    const colors = [
      { bg: 'bg-amber-100', text: 'text-amber-700' },
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getStatus = (balance: number, lastPurchaseDate?: string) => {
    let isOverdue = false;
    if (lastPurchaseDate) {
      const diffDays = Math.floor((new Date().getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24));
      isOverdue = diffDays > 30;
    }
    
    if (balance > 0 && isOverdue) return { label: 'Overdue', className: 'bg-red-100 text-red-800' };
    if (balance > 0) return { label: 'Owing', className: 'bg-amber-100 text-amber-800' };
    if (balance === 0 && lastPurchaseDate) return { label: 'Clear', className: 'bg-green-100 text-green-800' };
    return { label: 'Registered', className: 'bg-gray-100 text-gray-500' };
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto h-full flex flex-col w-full">
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden flex flex-col h-full flex-1">
        
        {/* Toolbar Row */}
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-[var(--color-bg-sunken)] border border-transparent rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:border-transparent focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-gray-400"
            />
          </div>
          
          <button
            onClick={() => setOwingOnly(!owingOnly)}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors border shrink-0 select-none cursor-pointer ${
              owingOnly 
                ? 'bg-amber-50 border-amber-300 text-amber-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Owing only
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#D97706] hover:bg-[#B45F06] text-white px-4 h-9 rounded-[var(--radius-md)] font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 shrink-0 select-none cursor-pointer w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>

        {/* Stat Cards Row */}
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-[10px] shrink-0 border-b border-[var(--color-border)] bg-gray-50/50">
          <div className="bg-white border border-[#E5E1DA] rounded-md p-3 shadow-sm">
            <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Total customers</h3>
            <p className="text-xl font-medium text-gray-900">{totalCustomers}</p>
          </div>
          <div className="bg-white border border-[#E5E1DA] rounded-md p-3 shadow-sm">
            <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Outstanding debt</h3>
            <p className={`text-xl font-medium ${outstandingDebt > 0 ? 'text-[#D97706]' : 'text-gray-900'}`}>
              KSH {outstandingDebt.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-[#E5E1DA] rounded-md p-3 shadow-sm">
            <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Overdue (&gt;30 days)</h3>
            <p className={`text-xl font-medium ${overdueDebt > 0 ? 'text-[#DC2626]' : 'text-gray-900'}`}>
              KSH {overdueDebt.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Customer Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-[#E5E1DA] w-[40%] bg-white sticky top-0 z-10">Customer</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-[#E5E1DA] w-[20%] bg-white sticky top-0 z-10">Balance</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-[#E5E1DA] w-[20%] bg-white sticky top-0 z-10">Last purchase</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-[#E5E1DA] w-[15%] bg-white sticky top-0 z-10">Status</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-[#E5E1DA] w-[80px] text-right bg-white sticky top-0 z-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-sm text-gray-500">Loading customers...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-sm text-red-500">Failed to load customers</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <UserCircle className="w-11 h-11 text-gray-300 mb-3" />
                      <h4 className="text-base font-medium text-gray-500 mb-1">No customers yet</h4>
                      <p className="text-sm text-gray-400 mb-4">Add a customer to track credit sales and purchase history.</p>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#D97706] hover:bg-[#B45F06] text-white px-4 h-9 rounded-[var(--radius-md)] font-medium text-sm transition-colors"
                      >
                        + Add Customer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const balance = Number(customer.balance);
                  const avatarStyle = getAvatarStyle(customer.name);
                  const status = getStatus(balance, customer.lastPurchaseDate);
                  const initials = customer.name.substring(0, 2).toUpperCase();

                  return (
                    <tr key={customer.id} className="h-12 border-b border-[#F0EDE8] hover:bg-[var(--color-bg-sunken)] transition-colors">
                      <td className="px-4 py-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarStyle.bg} ${avatarStyle.text}`}>
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 leading-tight">{customer.name}</span>
                            {customer.phone && (
                              <span className="text-xs text-gray-400 mt-0.5">{customer.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-0">
                        <span className={`text-sm ${balance > 0 ? 'text-[#D97706] font-medium' : 'text-gray-500'}`}>
                          KSH {balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-0">
                        <span className="text-sm text-gray-500">
                          {getRelativeTime(customer.lastPurchaseDate)}
                        </span>
                      </td>
                      <td className="px-4 py-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-0 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-[#D97706] rounded-md transition-colors" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-[#D97706] rounded-md transition-colors" 
                            title="Edit customer"
                            onClick={() => {
                              // We will implement edit later as per spec
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
      />
    </div>
  );
};
