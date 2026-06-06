import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard,
  Pill,
  Receipt,
  Users,
  BarChart3,
  Settings,
  LogOut,
  X,
  Stethoscope
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { logout, user } = useAuth();

  let links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/billing', label: 'Create Bill (POS)', icon: Receipt },
    { to: '/inventory', label: 'Medicine Inventory', icon: Pill },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  if (user && user.role === 'billing') {
    links = [
      { to: '/billing', label: 'Create Bill (POS)', icon: Receipt }
    ];
  } else if (user && user.role === 'admin') {
    links.push({ to: '/settings', label: 'Admin Settings', icon: Settings });
  }

  const activeClass = 'flex items-center px-4 py-3 text-sm font-medium rounded-xl bg-primary-50 text-primary-600 border-l-4 border-primary-600 transition-all duration-200';
  const inactiveClass = 'flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200';

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <Stethoscope className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-none">Ganga Medico</h1>
              <span className="text-xs font-semibold text-primary-600">Store Management</span>
            </div>
          </div>
          <button
            className="p-1 rounded-lg lg:hidden hover:bg-slate-100 text-slate-500"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
            >
              <link.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user ? user.fullName : 'Chemist Shop'}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">
                {user ? user.role : 'Staff'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <Link
              to="/catalog"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
            >
              Open Public Catalog &rarr;
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
