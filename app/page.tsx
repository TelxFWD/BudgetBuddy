'use client'

import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RootState } from '@/store'
import { loginSuccess, setLoading, setError } from '@/store/authSlice'
import { authService } from '@/services/auth'
import { PhoneIcon, ShieldCheckIcon, ArrowRightIcon } from 'lucide-react'

export default function LoginPage() {
  const dispatch = useDispatch()
  const router = useRouter()
  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth)
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [demoOtp, setDemoOtp] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber.trim()) {
      dispatch(setError('Please enter your phone number'))
      return
    }

    dispatch(setLoading(true))
    dispatch(setError(null))

    try {
      const response = await authService.sendOTP({ phone_number: phoneNumber })
      setDemoOtp(response.demo_otp || null)
      setStep('otp')
      setCountdown(60)
    } catch (error: any) {
      dispatch(setError(error.response?.data?.detail || 'Failed to send OTP'))
    } finally {
      dispatch(setLoading(false))
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otpCode.trim()) {
      dispatch(setError('Please enter the OTP code'))
      return
    }

    dispatch(setLoading(true))
    dispatch(setError(null))

    try {
      const response = await authService.verifyOTP({
        phone_number: phoneNumber,
        otp_code: otpCode
      })
      dispatch(loginSuccess(response.access_token))
      router.push('/dashboard')
    } catch (error: any) {
      dispatch(setError(error.response?.data?.detail || 'Invalid OTP code'))
    } finally {
      dispatch(setLoading(false))
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return

    dispatch(setLoading(true))
    try {
      const response = await authService.sendOTP({ phone_number: phoneNumber })
      setDemoOtp(response.demo_otp || null)
      setCountdown(60)
    } catch (error: any) {
      dispatch(setError(error.response?.data?.detail || 'Failed to resend OTP'))
    } finally {
      dispatch(setLoading(false))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-r from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">AutoForwardX</h1>
          <p className="text-slate-400">Secure Message Forwarding Platform</p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-card backdrop-blur-lg border border-dark-border rounded-2xl p-8 shadow-2xl"
        >
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Sign In</h2>
                <p className="text-dark-text-secondary text-sm">
                  Enter your phone number to receive an OTP code
                </p>
              </div>

              <div className="relative">
                <PhoneIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-error/20 border border-error/50 rounded-xl p-3 text-error text-sm"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRightIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Verify OTP</h2>
                <p className="text-dark-text-secondary text-sm">
                  Enter the 5-digit code sent to {phoneNumber}
                </p>
              </div>

              {demoOtp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center"
                >
                  <p className="text-green-400 text-sm font-medium mb-2">📱 Demo OTP Code</p>
                  <div 
                    className="bg-green-500/10 rounded-lg p-3 cursor-pointer hover:bg-green-500/20 transition-colors"
                    onClick={() => setOtpCode(demoOtp)}
                  >
                    <code className="text-green-300 text-2xl font-mono font-bold tracking-widest">
                      {demoOtp}
                    </code>
                  </div>
                  <p className="text-green-400/80 text-xs mt-2">
                    Click on the code above to auto-fill, or copy and paste manually
                  </p>
                </motion.div>
              )}

              <div className="relative">
                <input
                  type="text"
                  placeholder="00000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-dark-text text-center text-2xl font-mono tracking-widest placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                  maxLength={5}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-error/20 border border-error/50 rounded-xl p-3 text-error text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1 bg-dark-border hover:bg-dark-bg text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 5}
                  className="flex-2 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-dark-text-secondary text-sm">
                    Resend OTP in {countdown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-slate-400 text-sm"
        >
          <p>Secure • Fast • Reliable</p>
          <p className="mt-2">© 2025 AutoForwardX. All rights reserved.</p>
        </motion.div>
      </motion.div>
    </div>
  )
}