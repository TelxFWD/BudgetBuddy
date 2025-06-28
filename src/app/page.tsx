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

export default function HomePage() {
  const dispatch = useDispatch();
  const { user, tokens, isLoading } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = authService.isAuthenticated();

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
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  );
}