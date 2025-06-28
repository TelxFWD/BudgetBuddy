'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { getCurrentUser } from '@/store/slices/authSlice';
import { fetchUserStats, fetchSystemHealth } from '@/store/slices/dashboardSlice';
import { authService } from '@/services/authService';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardHome from '@/components/DashboardHome';
import LoginForm from '@/components/LoginForm';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Toaster } from 'react-hot-toast';

export default function HomePage() {
  const dispatch = useDispatch();
  const { user, tokens, isLoading } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = authService.isAuthenticated();
  
  // Initialize WebSocket connection for real-time updates when authenticated
  useWebSocket();

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(getCurrentUser() as any);
    }
  }, [dispatch, isAuthenticated, user]);

  useEffect(() => {
    if (user) {
      dispatch(fetchUserStats() as any);
      dispatch(fetchSystemHealth() as any);
    }
  }, [dispatch, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-dark-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginForm />;
  }

  return (
    <>
      <DashboardLayout>
        <DashboardHome />
      </DashboardLayout>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid #374151'
          }
        }}
      />
    </>
  );
}