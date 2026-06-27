import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { ShieldAlert, BarChart3, Building2, LogOut } from 'lucide-react';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-[var(--color-bg-sidebar)] text-white shadow-md font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-[var(--color-accent)] w-6 h-6 animate-pulse" />
              <span className="font-bold text-lg tracking-tight">Platform Admin</span>
            </div>
            
            <nav className="flex space-x-4">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-[var(--color-accent)] text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink
                to="/admin/businesses"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-[var(--color-accent)] text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Building2 className="w-4 h-4" />
                Businesses
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{user?.firstName || user?.email || 'Admin'}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role || 'super_admin'}</div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors border border-gray-700 hover:border-red-800 cursor-pointer select-none"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
