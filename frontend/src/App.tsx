import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/stores/auth.store';
import { LoginPage } from './pages/LoginPage';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
          />

          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <div className="flex h-screen items-center justify-center">
                  <h1 className="text-4xl font-bold tracking-tight text-blue-600">
                    Dashboard
                  </h1>
                  <button 
                    onClick={() => useAuthStore.getState().logout()}
                    className="ml-4 px-4 py-2 bg-red-600 text-white rounded"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
