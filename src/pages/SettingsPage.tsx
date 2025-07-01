import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  Moon, 
  Sun, 
  Bell, 
  Shield, 
  CreditCard,
  Trash2,
  Save,
  AlertTriangle,
  User,
  Key,
  Globe
} from 'lucide-react'

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    telegram: true,
    errors: true
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleSaveSettings = () => {
    // Implementation for saving settings
    console.log('Settings saved')
  }

  const handleDeleteAccount = () => {
    // Implementation for account deletion
    setShowDeleteModal(false)
    logout()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences and security settings</p>
      </div>

      {/* Profile Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={user?.username || ''}
              className="input-field w-full"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              className="input-field w-full"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current Plan</label>
            <div className="flex items-center space-x-3">
              <span className={`status-badge ${
                user?.plan === 'elite' ? 'status-active' : 
                user?.plan === 'pro' ? 'bg-blue-900/50 text-blue-400 border border-blue-800' : 
                'status-paused'
              }`}>
                {user?.plan?.toUpperCase()} Plan
              </span>
              <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                Upgrade →
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Member Since</label>
            <input
              type="text"
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
              className="input-field w-full"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-purple-600 p-2 rounded-lg">
            <Moon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Appearance</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Dark Mode</p>
            <p className="text-gray-400 text-sm">Use dark theme across the application</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              darkMode ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-green-600 p-2 rounded-lg">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-gray-400 text-sm">Receive updates via email</p>
            </div>
            <button
              onClick={() => setNotifications({...notifications, email: !notifications.email})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.email ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.email ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Telegram Notifications</p>
              <p className="text-gray-400 text-sm">Get notified in Telegram</p>
            </div>
            <button
              onClick={() => setNotifications({...notifications, telegram: !notifications.telegram})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.telegram ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.telegram ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Error Alerts</p>
              <p className="text-gray-400 text-sm">Immediate notification for errors</p>
            </div>
            <button
              onClick={() => setNotifications({...notifications, errors: !notifications.errors})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.errors ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.errors ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-red-600 p-2 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Security</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Two-Factor Authentication</p>
              <p className="text-gray-400 text-sm">Secure your account with 2FA</p>
            </div>
            <button className="btn-secondary">Configure</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Active Sessions</p>
              <p className="text-gray-400 text-sm">Manage your login sessions</p>
            </div>
            <button className="btn-secondary">View Sessions</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">API Keys</p>
              <p className="text-gray-400 text-sm">Manage API access tokens</p>
            </div>
            <button className="btn-secondary">Manage Keys</button>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-yellow-600 p-2 rounded-lg">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Billing & Subscription</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Current Plan</p>
              <p className="text-gray-400 text-sm">{user?.plan?.toUpperCase()} Plan - Active</p>
            </div>
            <button className="btn-primary">Upgrade Plan</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Payment Method</p>
              <p className="text-gray-400 text-sm">**** **** **** 1234</p>
            </div>
            <button className="btn-secondary">Update</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Billing History</p>
              <p className="text-gray-400 text-sm">View past invoices and payments</p>
            </div>
            <button className="btn-secondary">View History</button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-800">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-red-600 p-2 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Export Data</p>
              <p className="text-gray-400 text-sm">Download all your data before deletion</p>
            </div>
            <button className="btn-secondary">Export</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Delete Account</p>
              <p className="text-gray-400 text-sm">Permanently delete your account and all data</p>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button 
          onClick={handleSaveSettings}
          className="btn-primary flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn-danger flex-1"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage