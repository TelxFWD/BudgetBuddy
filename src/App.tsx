import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/LoginPage'
import DashboardHome from './pages/DashboardHome'
import ForwardingPairs from './pages/ForwardingPairs'
import AccountsPage from './pages/AccountsPage'
import SettingsPage from './pages/SettingsPage'
// import AnalyticsPage from './pages/AnalyticsPage'

// Loading Spinner Component
const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
)

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
      />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<DashboardHome />} />
        <Route path="pairs" element={<ForwardingPairs />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="analytics" element={<div className="p-6"><h1 className="text-2xl text-white">Analytics - Coming Soon</h1></div>} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      {/* Default redirect */}
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
      />
      
      {/* Catch all */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
      />
    </Routes>
  )
}

export default App