import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Phone, Smartphone, Shield, Zap } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

const LoginPage: React.FC = () => {
  const { sendOTP, login, isLoading } = useAuth()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await sendOTP(phone)
      setSuccess('OTP sent to your Telegram account!')
      setStep('otp')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login(phone, otp)
      // Login successful, AuthContext will handle redirect
    } catch (err: any) {
      setError(err.message)
    }
  }

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Forward messages instantly with minimal delay'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and protected'
    },
    {
      icon: Smartphone,
      title: 'Multi-Platform',
      description: 'Works with Telegram and Discord seamlessly'
    }
  ]

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Features */}
        <div className="hidden lg:block">
          <h1 className="text-4xl font-bold text-white mb-6">
            Welcome to AutoForwardX
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            The most advanced message forwarding platform for power users
          </p>
          
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="bg-indigo-600 p-3 rounded-lg">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="card">
            <div className="text-center mb-8">
              <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
              <p className="text-gray-400">
                {step === 'phone' 
                  ? 'Enter your phone number to receive an OTP'
                  : 'Enter the OTP sent to your Telegram'
                }
              </p>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-900/50 border border-green-800 text-green-400 px-4 py-3 rounded-lg mb-6">
                {success}
              </div>
            )}

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="input-field w-full"
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !phone}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    OTP Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="input-field w-full text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Check your Telegram for the verification code
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone')
                      setOtp('')
                      setError('')
                    }}
                    className="btn-secondary flex-1"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !otp}
                    className="btn-primary flex-1 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Sign In'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm">
              New to AutoForwardX? Contact support for account setup
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage