'use client'

import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { RootState } from '@/store'
import { motion } from 'framer-motion'
import { 
  MessageSquareIcon, 
  UserIcon, 
  SettingsIcon, 
  LogOutIcon,
  ActivityIcon,
  PlusIcon
} from 'lucide-react'

export default function DashboardPage() {
  const dispatch = useDispatch()
  const router = useRouter()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.user)
  const { pairs } = useSelector((state: RootState) => state.forwarding)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageSquareIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">AutoForwardX</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <UserIcon className="w-5 h-5 text-slate-400" />
                <span className="text-sm">{user?.username || 'User'}</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  {user?.plan || 'free'}
                </span>
              </div>
              
              <button className="p-2 text-slate-400 hover:text-white transition-colors">
                <SettingsIcon className="w-5 h-5" />
              </button>
              
              <button className="p-2 text-slate-400 hover:text-white transition-colors">
                <LogOutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <ActivityIcon className="w-8 h-8 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Active Pairs</h3>
            </div>
            <p className="text-3xl font-bold text-white">{pairs.length}</p>
            <p className="text-slate-400 text-sm">Message forwarding pairs</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <MessageSquareIcon className="w-8 h-8 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Messages Today</h3>
            </div>
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-slate-400 text-sm">Successfully forwarded</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <UserIcon className="w-8 h-8 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Plan Status</h3>
            </div>
            <p className="text-3xl font-bold text-white capitalize">{user?.plan || 'Free'}</p>
            <p className="text-slate-400 text-sm">Current subscription</p>
          </motion.div>
        </div>

        {/* Forwarding Pairs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Forwarding Pairs</h2>
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Pair
            </button>
          </div>

          {pairs.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquareIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Forwarding Pairs</h3>
              <p className="text-slate-400 mb-6">
                Create your first forwarding pair to start automatic message forwarding
              </p>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto">
                <PlusIcon className="w-4 h-4" />
                Create First Pair
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pairs.map((pair) => (
                <div key={pair.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      pair.status === 'active' ? 'bg-green-400' : 
                      pair.status === 'paused' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <h4 className="text-white font-medium">
                        {pair.source_platform} → {pair.destination_platform}
                      </h4>
                      <p className="text-slate-400 text-sm">
                        Created {new Date(pair.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      pair.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                      pair.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {pair.status}
                    </span>
                    <button className="p-2 text-slate-400 hover:text-white transition-colors">
                      <SettingsIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}