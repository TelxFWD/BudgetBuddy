import React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Home, 
  ArrowRightLeft, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { cn } from '../utils/cn'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Forwarding Pairs', href: '/dashboard/pairs', icon: ArrowRightLeft },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Mobile sidebar - Hidden for dashboard landing */}
      {location.pathname !== '/dashboard' && (
        <div className={cn(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}>
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-dark-card border-r border-dark-border">
            <div className="flex items-center justify-between p-4">
              <h1 className="text-xl font-bold text-white">AutoForwardX</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <SidebarContent currentPath={location.pathname} onLogout={handleLogout} user={user} />
          </div>
        </div>
      )}

      {/* Desktop sidebar - Hidden for dashboard landing */}
      {location.pathname !== '/dashboard' && (
        <div className="hidden lg:fixed lg:left-0 lg:top-0 lg:h-full lg:w-64 lg:bg-dark-card lg:border-r lg:border-dark-border lg:block">
          <div className="p-4">
            <h1 className="text-xl font-bold text-white">AutoForwardX</h1>
            <p className="text-sm text-gray-400 mt-1">Message Forwarding</p>
          </div>
          <SidebarContent currentPath={location.pathname} onLogout={handleLogout} user={user} />
        </div>
      )}

      {/* Main content - Full Width for Dashboard Landing */}
      <div className={location.pathname === '/dashboard' ? 'w-full' : 'lg:ml-64'}>
        {/* Top bar - Hidden for dashboard landing */}
        {location.pathname !== '/dashboard' && (
          <div className="bg-dark-card border-b border-dark-border px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.plan} Plan</p>
                </div>
                <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className={location.pathname === '/dashboard' ? '' : 'p-6'}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

interface SidebarContentProps {
  currentPath: string
  onLogout: () => void
  user: any
}

const SidebarContent: React.FC<SidebarContentProps> = ({ currentPath, onLogout, user }) => {
  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-4 space-y-2">
        {navigation.map((item) => {
          const isActive = currentPath === item.href
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-dark-border hover:text-white'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          )
        })}
      </nav>

      {/* User info and logout */}
      <div className="border-t border-dark-border p-4">
        <div className="mb-3">
          <div className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            user?.plan === 'elite' ? 'bg-purple-900/50 text-purple-400 border border-purple-800' :
            user?.plan === 'pro' ? 'bg-blue-900/50 text-blue-400 border border-blue-800' :
            'bg-gray-900/50 text-gray-400 border border-gray-800'
          )}>
            {user?.plan?.toUpperCase()} Plan
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default DashboardLayout