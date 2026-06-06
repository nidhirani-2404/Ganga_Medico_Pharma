import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Catalog from './pages/Catalog';
import Customers from './pages/Customers';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';

// Authentication Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync token with storage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      
      // Decode JWT token payload
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        setUser(JSON.parse(jsonPayload));
      } catch (err) {
        console.error('Error parsing token:', err);
        logout();
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  // Helper for authenticated API calls
  const fetchWithAuth = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error('Session expired or unauthorized.');
    }
    
    return response;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, fetchWithAuth }}>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/catalog" element={<Catalog />} />
          
          {/* Login Route */}
          <Route path="/login" element={token ? <Navigate to={user?.role === 'billing' ? "/billing" : "/dashboard"} replace /> : <Login />} />

          {/* Protected Routes Wrapper */}
          <Route
            path="/*"
            element={
              token ? (
                user ? (
                  <DashboardLayout>
                    <Routes>
                      <Route path="/dashboard" element={user.role === 'billing' ? <Navigate to="/billing" replace /> : <Dashboard />} />
                      <Route path="/inventory" element={user.role === 'billing' ? <Navigate to="/billing" replace /> : <Inventory />} />
                      <Route path="/customers" element={user.role === 'billing' ? <Navigate to="/billing" replace /> : <Customers />} />
                      <Route path="/billing" element={<Billing />} />
                      <Route path="/reports" element={user.role === 'billing' ? <Navigate to="/billing" replace /> : <Reports />} />
                      <Route path="/settings" element={user.role === 'billing' ? <Navigate to="/billing" replace /> : <AdminSettings />} />
                      <Route path="*" element={<Navigate to={user.role === 'billing' ? "/billing" : "/dashboard"} replace />} />
                    </Routes>
                  </DashboardLayout>
                ) : (
                  <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                )
              ) : (
                <Navigate to="/catalog" replace />
              )
            }
          />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

// Sidebar + Header Dashboard Layout
function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen relative">
        {/* Top Header */}
        <Header setSidebarOpen={setSidebarOpen} />
        
        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
