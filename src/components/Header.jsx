import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Bell, Menu, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Header({ setSidebarOpen }) {
  const location = useLocation();
  const { fetchWithAuth, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const drawerRef = useRef(null);

  // Translate paths to readable headers
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard Analytics';
    if (path.startsWith('/inventory')) return 'Medicine Inventory';
    if (path.startsWith('/customers')) return 'Customer Accounts';
    if (path.startsWith('/billing')) return 'Billing System (Point of Sale)';
    if (path.startsWith('/reports')) return 'Sales & Stock Reports';
    if (path.startsWith('/settings')) return 'Admin Settings';
    return 'Ganga Medico';
  };

  const loadNotifications = async () => {
    if (!user || user.role === 'billing') return;
    try {
      const res = await fetchWithAuth('/api/reports/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 20 seconds
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle clicking outside drawer to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setShowDrawer(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/reports/notifications/${id}/read`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearRead = async () => {
    try {
      const res = await fetchWithAuth('/api/reports/notifications/clear', { method: 'DELETE' });
      if (res.ok) {
        loadNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'Out of Stock':
        return <div className="p-1 text-red-600 bg-red-100 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>;
      case 'Low Stock':
        return <div className="p-1 text-orange-600 bg-orange-100 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>;
      case 'Expiry Warning':
        return <div className="p-1 text-yellow-600 bg-yellow-100 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>;
      case 'Credit Due':
        return <div className="p-1 text-blue-600 bg-blue-100 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>;
      default:
        return <div className="p-1 text-slate-600 bg-slate-100 rounded-lg"><Bell className="w-4 h-4" /></div>;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200">
      {/* Left side: hamburger menu & page title */}
      <div className="flex items-center gap-3">
        <button
          className="p-2 -ml-2 rounded-lg lg:hidden hover:bg-slate-100 text-slate-600"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
      </div>

      {/* Right side: notification bell */}
      {user && user.role !== 'billing' && (
        <div className="relative" ref={drawerRef}>
        <button
          onClick={() => setShowDrawer(!showDrawer)}
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {showDrawer && (
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
              <span className="text-xs font-bold text-slate-800">Store Notifications</span>
              {notifications.some(n => n.is_read) && (
                <button
                  onClick={clearRead}
                  className="text-[10px] font-bold text-primary-600 hover:text-primary-700 hover:underline"
                >
                  Clear Read Alerts
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Bell className="w-8 h-8 mb-2 stroke-1" />
                  <p className="text-xs">No active store warnings</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 text-xs transition-colors hover:bg-slate-50 ${
                      !notif.is_read ? 'bg-primary-50/30' : ''
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{notif.type}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 leading-snug break-words">{notif.message}</p>
                      {!notif.is_read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="mt-1 text-[10px] font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </header>
  );
}
