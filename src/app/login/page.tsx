'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { login, sendTelegramOTP, verifyTelegramOTP } from '@/store/slices/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Smartphone, 
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  Zap,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, user } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  
  // Email/Password Login Form
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // Telegram OTP Form
  const [telegramForm, setTelegramForm] = useState({
    phone_number: '',
    otp_code: ''
  });
  
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.username || !loginForm.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await dispatch(login(loginForm)).unwrap();
      toast.success('Login successful!');
      router.push('/');
    } catch (error: any) {
      toast.error(error || 'Login failed');
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!telegramForm.phone_number) {
      toast.error('Please enter your phone number');
      return;
    }

    try {
      await dispatch(sendTelegramOTP({ phone_number: telegramForm.phone_number })).unwrap();
      setOtpSent(true);
      setCountdown(60);
      toast.success('OTP sent to your Telegram!');
    } catch (error: any) {
      toast.error(error || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!telegramForm.otp_code) {
      toast.error('Please enter the OTP code');
      return;
    }

    try {
      await dispatch(verifyTelegramOTP({
        phone_number: telegramForm.phone_number,
        otp_code: telegramForm.otp_code
      })).unwrap();
      toast.success('Telegram login successful!');
      router.push('/');
    } catch (error: any) {
      toast.error(error || 'OTP verification failed');
    }
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    return `+${cleaned.slice(0, -10)} (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-slate-900 flex items-center justify-center p-4">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-green rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-neon-orange rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-300"></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-700"></div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-neon-green rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-black" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-neon-orange rounded-full flex items-center justify-center">
                <Zap className="h-2 w-2 text-black" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-dark-text">AutoForwardX</h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-dark-muted"
          >
            Multi-platform message forwarding made simple
          </motion.p>
        </div>

        {/* Login Card */}
        <Card className="bg-dark-card-95 backdrop-blur-sm border-dark-border shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-dark-text">
              Welcome Back
            </CardTitle>
            <p className="text-sm text-dark-muted text-center">
              Sign in to your account to continue
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-dark-border">
                <TabsTrigger 
                  value="email" 
                  className="flex items-center gap-2 data-[state=active]:bg-dark-border data-[state=active]:text-dark-text"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger 
                  value="telegram"
                  className="flex items-center gap-2 data-[state=active]:bg-dark-border data-[state=active]:text-dark-text"
                >
                  <Smartphone className="h-4 w-4" />
                  Telegram
                </TabsTrigger>
              </TabsList>

              {/* Email Login */}
              <TabsContent value="email" className="space-y-4 mt-6">
                <motion.form
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleEmailLogin}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-dark-text font-medium">
                      Username or Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-dark-muted" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username or email"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                        className="pl-10 h-12 bg-dark-border border-dark-border focus:border-neon-green focus:ring-neon-green/20 text-dark-text placeholder:text-dark-muted"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-dark-text font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-dark-muted" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10 h-12 bg-dark-border border-dark-border focus:border-neon-green focus:ring-neon-green/20 text-dark-text placeholder:text-dark-muted"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-dark-muted hover:text-dark-text transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !loginForm.username || !loginForm.password}
                    className="w-full h-12 bg-neon-green hover:bg-neon-green/90 text-black font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              </TabsContent>

              {/* Telegram Login */}
              <TabsContent value="telegram" className="space-y-4 mt-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {!otpSent ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-dark-text font-medium">
                          Phone Number
                        </Label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-3 h-4 w-4 text-dark-muted" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={telegramForm.phone_number}
                            onChange={(e) => setTelegramForm(prev => ({ 
                              ...prev, 
                              phone_number: formatPhoneNumber(e.target.value)
                            }))}
                            className="pl-10 h-12 bg-dark-border border-dark-border focus:border-blue-400 focus:ring-blue-400/20 text-dark-text placeholder:text-dark-muted"
                            disabled={isLoading}
                          />
                        </div>
                        <p className="text-xs text-dark-muted">
                          We'll send a verification code to your Telegram account
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading || !telegramForm.phone_number}
                        className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            Send OTP
                            <MessageSquare className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <div className="text-center space-y-2 mb-4">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                          <MessageSquare className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-dark-text">Check Your Telegram</h3>
                        <p className="text-sm text-dark-muted">
                          We sent a verification code to {telegramForm.phone_number}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="otp" className="text-dark-text font-medium">
                          Verification Code
                        </Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={telegramForm.otp_code}
                          onChange={(e) => setTelegramForm(prev => ({ 
                            ...prev, 
                            otp_code: e.target.value.replace(/\D/g, '').slice(0, 6)
                          }))}
                          className="h-12 text-center text-lg font-mono bg-dark-border border-dark-border focus:border-blue-400 focus:ring-blue-400/20 text-dark-text placeholder:text-dark-muted"
                          disabled={isLoading}
                          maxLength={6}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading || telegramForm.otp_code.length !== 6}
                        className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify Code
                            <CheckCircle className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <div className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setOtpSent(false);
                            setTelegramForm(prev => ({ ...prev, otp_code: '' }));
                          }}
                          className="text-dark-muted hover:text-dark-text text-sm"
                        >
                          Use a different number
                        </Button>
                        
                        {countdown > 0 ? (
                          <p className="text-xs text-dark-muted mt-2">
                            Resend code in {countdown}s
                          </p>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleSendOTP}
                            className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                          >
                            Resend code
                          </Button>
                        )}
                      </div>
                    </form>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-dark-border">
              <p className="text-xs text-dark-muted">
                Don't have an account?{' '}
                <button className="text-neon-green hover:text-neon-green/80 font-medium transition-colors">
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-neon-green/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-neon-green" />
            </div>
            <p className="text-xs text-dark-muted font-medium">Multi-Platform</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-neon-orange/10 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-neon-orange" />
            </div>
            <p className="text-xs text-dark-muted font-medium">Real-Time</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs text-dark-muted font-medium">Secure</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}