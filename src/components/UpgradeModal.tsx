import React from 'react'
import { Crown, X } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  currentPlan: string
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  currentPlan
}) => {
  if (!isOpen) return null

  const getUpgradePlans = () => {
    if (currentPlan.toLowerCase() === 'free') {
      return [
        {
          name: 'Pro',
          price: '$9.99/month',
          features: ['15 Forwarding Pairs', 'Cross-Platform Support', 'Text Filtering', 'CSV Export'],
          color: 'blue'
        },
        {
          name: 'Elite',
          price: '$29.99/month',
          features: ['Unlimited Pairs', 'Copy Mode', 'API Access', 'PDF Export', 'Priority Support'],
          color: 'purple'
        }
      ]
    } else if (currentPlan.toLowerCase() === 'pro') {
      return [
        {
          name: 'Elite',
          price: '$29.99/month',
          features: ['Unlimited Pairs', 'Copy Mode', 'API Access', 'PDF Export', 'Priority Support'],
          color: 'purple'
        }
      ]
    }
    return []
  }

  const plans = getUpgradePlans()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Crown className="h-6 w-6 text-yellow-400 mr-2" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300">{message}</p>
        </div>

        {plans.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Available Upgrades:</h3>
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`border rounded-xl p-4 ${
                  plan.color === 'blue'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-purple-500 bg-purple-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-bold text-white">{plan.name} Plan</h4>
                    <p className={`text-lg font-semibold ${
                      plan.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                    }`}>
                      {plan.price}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      alert(`Upgrade to ${plan.name} plan coming soon! Payment integration will be implemented.`)
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      plan.color === 'blue'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    Upgrade Now
                  </button>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-300">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal