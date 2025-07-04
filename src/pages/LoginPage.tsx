
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

interface SendOTPResponse {
  success: boolean;
  message: string;
  session_string?: string;
  phone_code_hash?: string;
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  access_token?: string;
  refresh_token?: string;
  user?: any;
}

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Step management
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  // Form states
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Session data from send-otp
  const [sessionString, setSessionString] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Resend timer
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);

  // Timer countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
    } else if (resendTimer === 0 && !canResend) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer, canResend]);

  // Clean phone number format
  const cleanPhoneNumber = (phoneNumber: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  };

  // Validate phone number
  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = cleanPhoneNumber(phoneNumber);
    // Basic validation: should be +countrycode followed by 10+ digits
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(cleaned);
  };

  // Handle phone submission
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    const cleanedPhone = cleanPhoneNumber(phone);
    
    if (!validatePhone(cleanedPhone)) {
      setError('Invalid phone number format. Please use +91xxxxxxxxxx format');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await axiosInstance.post<SendOTPResponse>('/api/telegram/send-otp', {
        phone: cleanedPhone
      });

      if (response.data.success) {
        // Store session data
        setSessionString(response.data.session_string || '');
        setPhoneCodeHash(response.data.phone_code_hash || '');
        
        // Move to OTP step
        setStep('otp');
        setSuccess('OTP sent successfully! Check your Telegram messages.');
        
        // Start resend timer
        setResendTimer(60);
        setCanResend(false);
        
        // Update phone to cleaned version
        setPhone(cleanedPhone);
      } else {
        setError(response.data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      
      if (error.response?.status === 400) {
        setError('Invalid phone number. Please check and try again.');
      } else if (error.response?.status === 429) {
        setError('Too many requests. Please wait before trying again.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP submission
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await axiosInstance.post<VerifyOTPResponse>('/api/telegram/verify-otp', {
        phone: phone,
        otp: otp,
        session_string: sessionString,
        phone_code_hash: phoneCodeHash
      });

      if (response.data.success && response.data.access_token) {
        // Store JWT token
        localStorage.setItem('access_token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        
        // Initialize auth context
        await login(phone, otp);
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Invalid OTP code');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.detail || 'Invalid OTP code';
        setError(errorMsg);
      } else if (error.response?.status === 422) {
        setError('OTP expired. Please request a new one.');
      } else if (error.response?.status === 500) {
        setError('Authentication failed. Please try again.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await axiosInstance.post<SendOTPResponse>('/api/telegram/send-otp', {
        phone: phone
      });

      if (response.data.success) {
        // Update session data
        setSessionString(response.data.session_string || '');
        setPhoneCodeHash(response.data.phone_code_hash || '');
        
        setSuccess('New OTP sent successfully!');
        
        // Restart timer
        setResendTimer(60);
        setCanResend(false);
      } else {
        setError(response.data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to phone step
  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setSuccess('');
    setSessionString('');
    setPhoneCodeHash('');
  };

  // Reset all states
  const resetStates = () => {
    setPhone('');
    setOtp('');
    setStep('phone');
    setError('');
    setSuccess('');
    setSessionString('');
    setPhoneCodeHash('');
    setResendTimer(0);
    setCanResend(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">AutoForwardX</h1>
          <p className="text-gray-300">
            {step === 'phone' ? 'Enter your phone number' : 'Enter verification code'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Phone Step */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91xxxxxxxxxx"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending OTP...
                  </div>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-white mb-2">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  maxLength={6}
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-400 mt-2">
                  Sent to: {phone}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToPhone}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  ← Change Phone
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!canResend || isLoading}
                  className="text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                </button>
              </div>
            </form>
          )}

          {/* Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Secure phone-based authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
