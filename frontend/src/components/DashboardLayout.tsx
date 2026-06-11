import React, { useState } from 'react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { 
  Package, 
  LayoutDashboard, 
  LogOut, 
  Settings,
  ShoppingCart,
  Users,
  Briefcase,
  FileText,
  Bell
} from 'lucide-react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export const DashboardLayout: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS', path: '/pos', icon: ShoppingCart },
    { name: 'Catalog', path: '/catalog', icon: Package },
    { name: 'Inventory', path: '/inventory', icon: Briefcase },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Suppliers', path: '/suppliers', icon: Users },
    { name: 'Team', path: '/team', icon: Users },
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  // Helper for tooltip
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex text-[var(--color-text-primary)] font-sans">
      
      {/* Sidebar (56px wide, dark) */}
      <div className="w-14 bg-[var(--color-bg-sidebar)] flex flex-col items-center py-4 relative z-20">
        <div className="h-10 w-10 bg-white/10 rounded flex items-center justify-center mb-6">
          <span className="text-[var(--color-accent)] font-bold text-sm">HW</span>
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
                  {/* Active Indicator (3px amber border on the left) */}
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
          <button className="relative flex items-center justify-center w-full h-12 text-[var(--color-text-inverse)]/60 hover:text-[var(--color-text-inverse)] hover:bg-white/5 transition-colors">
             <Settings className="h-5 w-5" />
          </button>
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
        <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] flex items-center justify-between px-6 shrink-0">
          {/* We would typically render the page title dynamically here based on route. For now, we leave it to the page components or grab a default */}
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {navItems.find(i => location.pathname === i.path || (location.pathname.startsWith(i.path) && i.path !== '/'))?.name || 'Dashboard'}
          </h1>
          
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-[var(--color-text-muted)] tracking-wide uppercase">
              {today}
            </span>
            <button className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <Bell className="h-5 w-5" />
              {/* Notification badge example */}
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[var(--color-danger)]"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[var(--color-bg-base)]">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
};
