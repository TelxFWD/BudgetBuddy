import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { CreditCard, Crown, Check, X, Calendar, AlertTriangle } from 'lucide-react'

const BillingPage: React.FC = () => {
  const { user } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState<any>(null)

  const userPlan = user?.plan?.toLowerCase() || 'free'
  
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      features: ['1 Forwarding Pair', 'Basic Support', 'Telegram → Telegram Only'],
      color: 'gray'
    },
    pro: {
      name: 'Pro',
      price: 9.99,
      features: ['15 Forwarding Pairs', 'Cross-Platform Forwarding', 'CSV Export', 'Priority Support'],
      color: 'blue'
    },
    elite: {
      name: 'Elite',
      price: 29.99,
      features: ['Unlimited Pairs', 'Copy Mode', 'Content Filtering', 'PDF Export', 'API Access', 'VIP Support'],
      color: 'purple'
    }
  }

  const currentPlan = plans[userPlan as keyof typeof plans] || plans.free

  const handleUpgrade = (planName: string) => {
    alert(`Upgrade to ${planName} plan coming soon! Payment integration will be implemented.`)
  }

  const handleAddPaymentMethod = () => {
    alert('Payment method management coming soon!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Billing</h1>
        <p className="text-gray-400 mt-1">Manage your subscription and payment methods</p>
      </div>

      {/* Current Plan */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Current Plan</h2>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            userPlan === 'elite' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
            userPlan === 'pro' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
            'bg-gray-500/20 text-gray-300 border border-gray-500/30'
          }`}>
            {currentPlan.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Plan Details</h3>
            <div className="space-y-2">
              <p className="text-gray-400">
                <span className="font-medium">Plan:</span> {currentPlan.name}
              </p>
              <p className="text-gray-400">
                <span className="font-medium">Price:</span> ${currentPlan.price}/month
              </p>
              <p className="text-gray-400">
                <span className="font-medium">Status:</span> Active
              </p>
              <p className="text-gray-400">
                <span className="font-medium">Next Billing:</span> {userPlan === 'free' ? 'N/A' : '2025-08-02'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-3">Plan Features</h3>
            <ul className="space-y-2">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-400 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {userPlan !== 'elite' && (
          <div className="mt-6 pt-6 border-t border-gray-600">
            <button
              onClick={() => handleUpgrade(userPlan === 'free' ? 'Pro' : 'Elite')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-colors font-medium"
            >
              <Crown className="h-4 w-4 mr-2 inline" />
              Upgrade to {userPlan === 'free' ? 'Pro' : 'Elite'}
            </button>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Available Plans</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className={`relative bg-gray-700/50 rounded-xl p-6 border ${
                key === userPlan ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-600'
              }`}
            >
              {key === userPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-white">
                  ${plan.price}
                  <span className="text-base font-normal text-gray-400">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-300">
                    <Check className="h-4 w-4 text-green-400 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.name)}
                disabled={key === userPlan}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  key === userPlan
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700'
                }`}
              >
                {key === userPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Payment Methods</h2>
          <button
            onClick={handleAddPaymentMethod}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Add Payment Method
          </button>
        </div>

        {!paymentMethod ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No payment methods added yet</p>
            <button
              onClick={handleAddPaymentMethod}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-colors"
            >
              Add Your First Payment Method
            </button>
          </div>
        ) : (
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 text-gray-400 mr-3" />
                <div>
                  <p className="text-white font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-gray-400">Expires 12/25</p>
                </div>
              </div>
              <button className="text-sm text-indigo-400 hover:text-indigo-300">
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Billing History</h2>
        
        {userPlan === 'free' ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No billing history for free plan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { date: '2025-07-02', amount: currentPlan.price, status: 'Paid', invoice: 'INV-001' },
              { date: '2025-06-02', amount: currentPlan.price, status: 'Paid', invoice: 'INV-002' },
              { date: '2025-05-02', amount: currentPlan.price, status: 'Paid', invoice: 'INV-003' },
            ].map((bill, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4">
                <div>
                  <p className="text-white font-medium">${bill.amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-400">{bill.date} • {bill.invoice}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                    {bill.status}
                  </span>
                  <button className="text-sm text-indigo-400 hover:text-indigo-300">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BillingPage