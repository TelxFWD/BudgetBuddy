'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/authService'
import { toast } from 'react-hot-toast'
import { MessageSquare, Loader2, ArrowLeft, Phone, Shield } from 'lucide-react'

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      await authService.sendOTP(phoneNumber)
      setStep('otp')
      toast.success('OTP sent successfully!')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to send OTP'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otpCode.trim()) {
      setError('Please enter the OTP code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await authService.verifyOTP(phoneNumber, otpCode)
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Invalid OTP code'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="relative w-full max-w-md z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-2">
            AutoForwardX
          </h1>
          <p className="text-gray-400 text-sm">
            Seamless message forwarding between platforms
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl transform hover:shadow-3xl transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {step === 'phone' ? 'Welcome Back' : 'Verify Your Identity'}
            </h2>
            <p className="text-gray-400 text-sm">
              {step === 'phone' 
                ? 'Enter your phone number to receive a verification code' 
                : `We sent a verification code to ${phoneNumber}`
              }
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center space-x-3 animate-pulse">
              <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-3">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-lg"
                    placeholder="e.g., +1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Include country code for international numbers
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !phoneNumber.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-3">
                  Verification Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Enter the 6-digit code sent to your phone
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setError('')
                    setOtpCode('')
                  }}
                  className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 border border-gray-600/50 transform hover:scale-[1.02]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      <span>Verify Code</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-gray-700/50">
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <p className="text-xs">
                Your data is encrypted and secure
              </p>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 text-center">
              By continuing, you agree to our{' '}
              <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2025 AutoForwardX. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}