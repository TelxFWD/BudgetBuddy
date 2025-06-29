'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { 
  Home, 
  Smartphone, 
  MessageSquare, 
  Link, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Menu, 
  X,
  LogOut,
  Bell
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Link, label: 'Forwarding Pairs', href: '/forwarding' },
  { icon: Smartphone, label: 'Telegram Accounts', href: '/telegram' },
  { icon: MessageSquare, label: 'Discord Servers', href: '/discord' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: CreditCard, label: 'Billing', href: '/billing' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-dark-card border-r border-dark-border transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-dark-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg"></div>
            <span className="text-lg font-bold text-dark-text">AutoForwardX</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-dark-muted hover:text-dark-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-3 text-dark-muted hover:text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-all duration-300 group mb-1"
            >
              <item.icon className="h-5 w-5 mr-3 group-hover:text-neon-blue transition-colors" />
              {item.label}
            </a>
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-text truncate">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-dark-muted capitalize">
                {user?.plan || 'free'} plan
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-dark-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-300"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-dark-muted hover:text-dark-text"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center space-x-4 ml-auto">
            <button className="text-dark-muted hover:text-dark-text relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-neon-orange rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}