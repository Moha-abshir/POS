import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { OnboardingModal } from '../features/auth/components/OnboardingModal';
import SyncIndicator from './SyncIndicator';
import { 
  Package, 
  LayoutDashboard, 
  LogOut, 
  Settings,
  ShoppingCart, Store,
  Users,
  Boxes,
  FileText,
  Bell,
  Truck,
  Contact,
  Receipt,
  X,
  RefreshCw,
  Calculator,
  AlertTriangle,
  Menu
} from 'lucide-react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { db } from '../core/offline/offlineDatabase';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS', path: '/pos', icon: ShoppingCart },
    { name: 'Sales', path: '/sales', icon: Receipt },
    { name: 'Catalog', path: '/catalog', icon: Package },
    { name: 'Inventory', path: '/inventory', icon: Boxes },
    { name: 'Purchasing', path: '/purchasing', icon: Truck },
    ...(user?.role === 'OWNER' ? [
      { name: 'Customers', path: '/customers', icon: Users },
      { name: 'Team', path: '/team', icon: Contact },
      { name: 'Reports', path: '/reports', icon: FileText }
    ] : [])
  ];

  // Helper for tooltip
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const today = new Date().toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  const { hasSkippedOnboarding } = useAuthStore();
  const showOnboarding = user && !hasSkippedOnboarding && (!user.firstName || (user.role === 'OWNER' && !user.isSetupComplete));

  // Notifications state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cash Register Session state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [openingFloat, setOpeningFloat] = useState('');
  
  // Register closure counter state
  const [isClosingStep, setIsClosingStep] = useState(false);
  const [notes, setNotes] = useState('');
  const [counts, setCounts] = useState<Record<number, number>>({
    1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0
  });

  const KES_DENOMINATIONS = [
    { value: 1000, label: '1,000 Note', type: 'note' },
    { value: 500, label: '500 Note', type: 'note' },
    { value: 200, label: '200 Note', type: 'note' },
    { value: 100, label: '100 Note', type: 'note' },
    { value: 50, label: '50 Note', type: 'note' },
    { value: 20, label: '20 Coin', type: 'coin' },
    { value: 10, label: '10 Coin', type: 'coin' },
    { value: 5, label: '5 Coin', type: 'coin' },
    { value: 1, label: '1 Coin', type: 'coin' },
  ];

  const totalCounted = Object.entries(counts).reduce((acc, [val, qty]) => acc + (Number(val) * qty), 0);

  // Fetch alerts and register session
  const fetchData = useCallback(async () => {
    // 1. Fetch notifications
    try {
      const notifRes = await api.get('/notifications');
      setNotificationsList(notifRes.data.data);
      const unreadRes = await api.get('/notifications/unread-count');
      setUnreadCount(unreadRes.data.count);
    } catch (err) {
      console.warn('Error fetching notifications (possibly offline):', err);
    }

    // 2. Fetch active cash register session
    try {
      if (navigator.onLine) {
        const sessionRes = await api.get('/cash-sessions/active');
        const active = sessionRes.data.data;
        setActiveSession(active);
        await db.settings.put({ key: 'active_session', value: active });
      } else {
        throw new Error('Offline');
      }
    } catch (err) {
      console.warn('Error fetching active register session (using local offline cache):', err);
      try {
        const cachedSession = await db.settings.get('active_session');
        if (cachedSession) {
          setActiveSession(cachedSession.value);
        } else {
          setActiveSession(null);
        }
      } catch (dbErr) {
        console.error('Error reading cached session:', dbErr);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 30s for live updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleOpenRegister = async () => {
    if (!openingFloat || Number(openingFloat) < 0) {
      toast.error('Please input a valid opening float');
      return;
    }
    try {
      const res = await api.post('/cash-sessions/open', { openingFloat: Number(openingFloat) });
      const newSession = res.data.data;
      await db.settings.put({ key: 'active_session', value: newSession });
      toast.success('Cash register opened successfully');
      setOpeningFloat('');
      setIsRegisterModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to open register');
    }
  };

  const handleCloseRegister = async () => {
    try {
      await api.post('/cash-sessions/close', {
        denominationCounts: counts,
        actualCash: totalCounted,
        notes: notes.trim(),
      });
      await db.settings.put({ key: 'active_session', value: null });
      toast.success('Cash register closed successfully');
      setNotes('');
      setCounts({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
      setIsClosingStep(false);
      setIsRegisterModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to close register');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatKES = (amount: number) => {
    return amount.toLocaleString('en-KE', { style: 'currency', currency: 'KES' });
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg-base)] flex text-[var(--color-text-primary)] font-sans">
      {showOnboarding && <OnboardingModal />}
      
      {/* Sidebar (56px wide, dark) */}
      <div className="w-14 bg-[var(--color-bg-sidebar)] hidden md:flex flex-col items-center py-4 relative z-20">
        <div className="h-10 w-10 bg-[var(--color-accent)]/20 rounded flex items-center justify-center mb-6">
          <Store className="text-[var(--color-accent)] w-5 h-5" />
        </div>

        <nav className="flex-1 w-full flex flex-col space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
            const Icon = item.icon;
            
            return (
              <div 
                key={item.name} 
                className="relative w-full flex justify-center"
                onMouseEnter={() => setHoveredNav(item.name)}
                onMouseLeave={() => setHoveredNav(null)}
              >
                <Link
                  to={item.path}
                  className={`relative flex items-center justify-center w-full h-12 transition-colors ${
                    isActive 
                      ? 'text-[var(--color-accent)] bg-white/5' 
                      : 'text-[var(--color-text-inverse)]/60 hover:text-[var(--color-text-inverse)] hover:bg-white/5'
                  }`}
                >
                  {/* Active Indicator (3px border on the left) */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors ${
                    isActive ? 'bg-[var(--color-accent)]' : hoveredNav === item.name ? 'bg-[var(--color-border-strong)]/30' : 'bg-transparent'
                  }`} />
                  
                  <Icon className="h-5 w-5" />
                </Link>

                {/* Tooltip */}
                {hoveredNav === item.name && (
                  <div className="absolute left-[72px] top-1/2 -translate-y-1/2 bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] px-3 py-1.5 rounded-md shadow-md text-sm font-medium whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="w-full flex flex-col items-center space-y-2 mt-auto">
          <Link to="/settings" className="relative flex items-center justify-center w-full h-12 text-[var(--color-text-inverse)]/60 hover:text-[var(--color-text-inverse)] hover:bg-white/5 transition-colors" title="Settings">
             <Settings className="h-5 w-5" />
          </Link>
          <button 
            onClick={logout}
            className="relative flex items-center justify-center w-full h-12 text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
            title="Sign Out"
          >
             <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bar */}
        <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-[var(--color-text-primary)]">
              {navItems.find(i => location.pathname === i.path || (location.pathname.startsWith(i.path) && i.path !== '/'))?.name || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <span className="hidden md:inline text-sm font-medium text-[var(--color-text-muted)] tracking-wide uppercase">
              {today}
            </span>

            <div className="hidden md:block">
              <SyncIndicator />
            </div>

            {/* Cash Drawer Shift Widget */}
            <button 
              onClick={() => {
                setIsClosingStep(false);
                setIsRegisterModalOpen(true);
              }}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                activeSession 
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              {activeSession ? 'Register: OPEN' : 'Register: CLOSED'}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[var(--color-border)] rounded-lg shadow-xl z-50 py-1 text-sm">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--color-border)] bg-gray-50 rounded-t-lg">
                      <span className="font-bold text-gray-950">Notifications Center</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead}
                          className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-bold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsList.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-400 text-xs">No notifications or alerts</div>
                      ) : (
                        notificationsList.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleMarkRead(notif.id)}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notif.isRead ? 'bg-amber-50/20 font-medium' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                notif.type === 'LOW_STOCK' ? 'text-amber-600' :
                                notif.type === 'CASH_DISCREPANCY' ? 'text-purple-600' :
                                notif.type === 'DAMAGE' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {notif.type.replace('_', ' ')}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-gray-900 mt-1">{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-normal">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[var(--color-bg-base)] pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* CASH REGISTER MANAGEMENT MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Calculator className="w-5 h-5 text-[var(--color-accent)]" />
                {activeSession 
                  ? (isClosingStep ? 'Register Reconciliation' : 'Cash Drawer Shift Info') 
                  : 'Open Cash Drawer Session'
                }
              </h3>
              <button 
                onClick={() => {
                  setIsClosingStep(false);
                  setIsRegisterModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 pr-1 text-sm text-gray-600 space-y-4">
              
              {/* STATE: CLOSED - Open Register Shift Form */}
              {!activeSession && (
                <div className="space-y-4 py-2">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Opening the cash drawer records your starting float cash (cash in the drawer to start matching transactions and issuing change).
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Opening Float Amount (KES)</label>
                    <input 
                      type="number" 
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(e.target.value)}
                      placeholder="e.g. 5,000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-semibold text-gray-900"
                    />
                  </div>
                  <button 
                    onClick={handleOpenRegister}
                    className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    Open Register Shift
                  </button>
                </div>
              )}

              {/* STATE: OPEN - Drawer shift summaries */}
              {activeSession && !isClosingStep && (
                <div className="space-y-3.5">
                  <div className="bg-green-50/50 border border-green-100 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Status</span>
                      <span className="font-bold text-green-700 uppercase tracking-wider">Active (Open)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Opened By</span>
                      <span className="font-bold text-gray-800">{activeSession.openedByFirstName} {activeSession.openedByLastName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Opened At</span>
                      <span className="font-medium text-gray-800">
                        {new Date(activeSession.openedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-b border-gray-100 py-3 space-y-2">
                    <div className="flex justify-between font-medium">
                      <span>Opening Float</span>
                      <span className="text-gray-900">{formatKES(Number(activeSession.openingFloat))}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setCounts({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
                      setNotes('');
                      setIsClosingStep(true);
                    }}
                    className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    Proceed to Count &amp; Close Register
                  </button>
                </div>
              )}

              {/* STATE: OPEN - Closing Shift Denomination Counter */}
              {activeSession && isClosingStep && (
                <div className="space-y-4">
                  <div className="text-xs text-gray-500">
                    Input the quantity of each coin or note denomination counted inside the cash drawer.
                  </div>

                  {/* Denomination Counter grid */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-xs">
                      <thead className="bg-gray-50 sticky top-0 font-bold uppercase tracking-wider text-gray-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Denomination</th>
                          <th className="px-3 py-2 text-center">Quantity</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-800">
                        {KES_DENOMINATIONS.map((denom) => (
                          <tr key={denom.value}>
                            <td className="px-3 py-1.5 text-left">{denom.label}</td>
                            <td className="px-3 py-1.5 text-center">
                              <input 
                                type="number" 
                                min="0"
                                value={counts[denom.value] || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setCounts(prev => ({ ...prev, [denom.value]: val }));
                                }}
                                className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-center focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold">
                              {formatKES((counts[denom.value] || 0) * denom.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Reconciliation summary */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Counted Cash</span>
                      <span className="font-bold text-gray-900 text-sm">{formatKES(totalCounted)}</span>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Closing Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this shift close..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-normal focus:outline-none text-gray-900 bg-white"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsClosingStep(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleCloseRegister}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors"
                    >
                      Close Shift Register
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Navigation overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-[var(--color-bg-sidebar)] z-50 md:hidden flex flex-col p-5 shadow-2xl animate-in slide-in-from-left duration-250">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-[var(--color-accent)]/20 rounded flex items-center justify-center">
                  <Store className="text-[var(--color-accent)] w-4.5 h-4.5" />
                </div>
                <span className="font-bold text-white text-sm tracking-wide">Smart Store POS</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[var(--color-text-inverse)]/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 w-full flex flex-col space-y-1.5 overflow-y-auto pr-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                      isActive 
                        ? 'text-[var(--color-accent)] bg-white/5 shadow-inner' 
                        : 'text-[var(--color-text-inverse)]/70 hover:text-[var(--color-text-inverse)] hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-white/5 flex flex-col gap-2 mt-auto">
              <Link 
                to="/settings" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-[var(--color-text-inverse)]/70 hover:text-[var(--color-text-inverse)] hover:bg-white/5 transition-all font-semibold text-sm"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-white/5 transition-all font-semibold text-sm cursor-pointer text-left w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation & Status Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111317] border-t border-white/5 flex items-center justify-around z-40 px-3">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 ${
            location.pathname === '/' ? 'text-[var(--color-accent)]' : 'text-gray-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/pos"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 ${
            location.pathname === '/pos' ? 'text-[var(--color-accent)]' : 'text-gray-400'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>POS</span>
        </Link>

        <div className="flex flex-col items-center justify-center w-16 h-full">
          <SyncIndicator variant="button" />
        </div>

        <button
          onClick={() => {
            setIsClosingStep(false);
            setIsRegisterModalOpen(true);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 ${
            activeSession ? 'text-green-500' : 'text-amber-500 animate-pulse'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span>{activeSession ? 'Shift: OPEN' : 'Shift: CLOSED'}</span>
        </button>
      </div>

    </div>
  );
};
