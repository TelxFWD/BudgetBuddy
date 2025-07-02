import React, { useState } from 'react'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Crown,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Globe
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { settingsAPI } from '../api/endpoints'

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    telegramNotifications: false,
    errorAlerts: true,
    systemUpdates: false,
    weeklyReports: true
  })

  // Theme settings
  const [themeSettings, setThemeSettings] = useState({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC'
  })

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      await settingsAPI.updateProfile({
        username: profileData.username,
        email: profileData.email,
        ...(profileData.newPassword && {
          current_password: profileData.currentPassword,
          new_password: profileData.newPassword
        })
      })
      
      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
      
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationUpdate = async () => {
    setLoading(true)
    try {
      await settingsAPI.updateNotifications(notificationSettings)
      alert('Notification settings updated successfully!')
    } catch (error) {
      console.error('Failed to update notifications:', error)
      alert('Failed to update notification settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmation === 'DELETE') {
      try {
        await settingsAPI.deleteAccount()
        logout()
        alert('Account deleted successfully.')
      } catch (error) {
        console.error('Failed to delete account:', error)
        alert('Failed to delete account. Please contact support.')
      }
    }
  }

  const getPlanBadge = (plan: string) => {
    const badges = {
      free: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      pro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      elite: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
    return badges[plan as keyof typeof badges] || badges.free
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Moon },
    { id: 'billing', name: 'Billing', icon: Crown }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                  <span className={`px-3 py-1 text-sm rounded-full border ${getPlanBadge(user?.plan || 'free')}`}>
                    {user?.plan || 'Free'} Plan
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={profileData.currentPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleProfileUpdate}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 flex items-center disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                
                <div className="space-y-4">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                      <div>
                        <p className="text-white font-medium">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                        <p className="text-sm text-gray-400">
                          {key === 'emailNotifications' && 'Receive important updates via email'}
                          {key === 'pushNotifications' && 'Browser push notifications for real-time alerts'}
                          {key === 'telegramNotifications' && 'Get notifications through Telegram bot'}
                          {key === 'errorAlerts' && 'Immediate alerts for system errors and failures'}
                          {key === 'systemUpdates' && 'News about system updates and new features'}
                          {key === 'weeklyReports' && 'Weekly summary of your forwarding activity'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleNotificationUpdate}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 flex items-center disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Security Settings</h2>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-300 mb-3">Danger Zone</h3>
                  <p className="text-gray-300 mb-4">
                    Once you delete your account, there is no going back. This will permanently delete your account, 
                    all forwarding pairs, and remove all associated data.
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Appearance & Language</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
                    <div className="space-y-2">
                      {[
                        { value: 'dark', label: 'Dark', icon: Moon },
                        { value: 'light', label: 'Light', icon: Sun }
                      ].map(({ value, label, icon: Icon }) => (
                        <label key={value} className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
                          <input
                            type="radio"
                            name="theme"
                            value={value}
                            checked={themeSettings.theme === value}
                            onChange={(e) => setThemeSettings(prev => ({ ...prev, theme: e.target.value }))}
                            className="sr-only"
                          />
                          <Icon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-white">{label}</span>
                          {themeSettings.theme === value && (
                            <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full"></div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Language</label>
                    <select
                      value={themeSettings.language}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Billing & Subscription</h2>
                
                <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">Current Plan</h3>
                      <p className="text-gray-400">You are currently on the {user?.plan || 'Free'} plan</p>
                    </div>
                    <Crown className="h-8 w-8 text-indigo-400" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { name: 'Free', price: '$0/month', features: ['1 Telegram account', 'Basic forwarding', 'Community support'] },
                      { name: 'Pro', price: '$9.99/month', features: ['3 accounts per platform', 'Discord support', 'Priority support'] },
                      { name: 'Elite', price: '$19.99/month', features: ['Unlimited accounts', 'API access', 'Custom webhooks'] }
                    ].map((plan) => (
                      <div key={plan.name} className={`p-4 rounded-lg border ${
                        user?.plan === plan.name.toLowerCase() 
                          ? 'border-indigo-500 bg-indigo-500/10' 
                          : 'border-gray-600 bg-gray-700/50'
                      }`}>
                        <h4 className="font-medium text-white">{plan.name}</h4>
                        <p className="text-2xl font-bold text-indigo-400 my-2">{plan.price}</p>
                        <ul className="text-sm text-gray-400 space-y-1">
                          {plan.features.map((feature, index) => (
                            <li key={index}>• {feature}</li>
                          ))}
                        </ul>
                        {user?.plan !== plan.name.toLowerCase() && (
                          <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                            Upgrade
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage