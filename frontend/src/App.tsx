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

const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
    <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">404</h1>
    <h2 className="text-xl font-semibold text-[var(--color-text-secondary)] mb-2">Page Not Found</h2>
    <p className="text-[var(--color-text-muted)] max-w-md">
      The page you are looking for doesn't exist or has been moved.
    </p>
  </div>
);

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
    <p className="text-[var(--color-text-muted)]">This module is under development and will be available soon.</p>
  </div>
);

import { Toaster } from 'react-hot-toast';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
          />

          {/* Protected Routes */}
          <Route 
            element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />}
          >
            <Route path="/" element={
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Welcome back to Hardware Store POS!</p>
              </div>
            } />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Missing nav links placeholders */}
            <Route path="/pos" element={<PosPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/purchasing" element={<PurchasingPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            
            {/* 404 Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
