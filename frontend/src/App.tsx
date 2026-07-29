import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/stores/auth.store';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './components/DashboardLayout';
import { CatalogPage } from './pages/CatalogPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import { PurchasingPage } from './pages/PurchasingPage';
import { InventoryPage } from './pages/InventoryPage';
import { CustomersPage } from './pages/CustomersPage';
import { PosPage } from './pages/PosPage';
import { SalesPage } from './pages/SalesPage';
import { ReportsPage } from './pages/ReportsPage';
import { DashboardPage } from './pages/DashboardPage';
import { BankingPage } from './pages/BankingPage';
import { ReconciliationLogsPage } from './pages/ReconciliationLogsPage';

// Import New Pages
import { AwaitingApprovalPage } from './pages/AwaitingApprovalPage';
import { AccountSuspendedPage } from './pages/AccountSuspendedPage';
import { AccountRejectedPage } from './pages/AccountRejectedPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminBusinessesPage } from './pages/AdminBusinessesPage';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { IndexedDBCache } from './features/catalog/utils/indexedDb';
import { salesApi } from './features/sales/api/sales.api';
import OfflineBanner from './components/OfflineBanner';
import { syncService } from './core/offline/syncService';

const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
    <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">404</h1>
    <h2 className="text-xl font-semibold text-[var(--color-text-secondary)] mb-2">Page Not Found</h2>
    <p className="text-[var(--color-text-muted)] max-w-md">
      The page you are looking for doesn't exist or has been moved.
    </p>
  </div>
);

import { Toaster } from 'react-hot-toast';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      syncService.startSync(queryClient);
    };

    if (navigator.onLine) {
      handleOnline();
    }

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient]);

  const isAdmin = isAuthenticated && user?.type === 'admin';
  const isUser = isAuthenticated && user?.type !== 'admin';
  
  const isPending = isUser && user?.businessStatus === 'pending';
  const isSuspended = isUser && user?.businessStatus === 'suspended';
  const isRejected = isUser && user?.businessStatus === 'rejected';
  const isActive = isUser && user?.businessStatus === 'active';

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        <OfflineBanner />
        <div className="flex-1 min-h-0 flex flex-col">
          <Toaster position="top-right" />
          <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated 
                ? (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />)
                : <LoginPage />
            } 
          />
          <Route 
            path="/admin/login" 
            element={
              isAuthenticated 
                ? (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />)
                : <AdminLoginPage />
            } 
          />

          {/* Status Pages (Protected, requires match) */}
          <Route 
            path="/awaiting-approval" 
            element={
              isPending 
                ? <AwaitingApprovalPage /> 
                : (isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />)
            }
          />
          <Route 
            path="/account-suspended" 
            element={
              isSuspended 
                ? <AccountSuspendedPage /> 
                : (isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />)
            }
          />
          <Route 
            path="/account-rejected" 
            element={
              isRejected 
                ? <AccountRejectedPage /> 
                : (isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />)
            }
          />

          {/* Platform Administration Module */}
          <Route 
            path="/admin" 
            element={isAdmin ? <AdminDashboardPage /> : <Navigate to="/admin/login" replace />} 
          />
          <Route 
            path="/admin/businesses" 
            element={isAdmin ? <AdminBusinessesPage /> : <Navigate to="/admin/login" replace />} 
          />

          {/* Tenant POS Protected Routes */}
          <Route 
            element={
              isAuthenticated 
                ? (isAdmin 
                    ? <Navigate to="/admin" replace /> 
                    : (isActive 
                        ? <DashboardLayout /> 
                        : (isPending 
                            ? <Navigate to="/awaiting-approval" replace /> 
                            : isSuspended 
                            ? <Navigate to="/account-suspended" replace /> 
                            : <Navigate to="/account-rejected" replace />
                          )
                      )
                  )
                : <Navigate to="/login" replace />
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cash-reconciliation" element={user?.role === 'OWNER' ? <ReconciliationLogsPage /> : <Navigate to="/" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/pos" element={<PosPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customers" element={user?.role === 'OWNER' ? <CustomersPage /> : <Navigate to="/" replace />} />
            <Route path="/purchasing" element={<PurchasingPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/banking" element={user?.isBankingEnabled ? <BankingPage /> : <Navigate to="/" replace />} />
            
            {/* 404 Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
