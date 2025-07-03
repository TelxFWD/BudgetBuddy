import api from './api'
import Cookies from 'js-cookie'

export interface OTPRequest {
  phone_number: string
}

export interface OTPVerifyRequest {
  phone_number: string
  otp_code: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface UserData {
  id: number
  username: string
  email: string
  plan: string
  status: string
  created_at: string
}

export const authService = {
  // Send OTP to phone number
  async sendOTP(data: OTPRequest): Promise<{ message: string }> {
    const response = await api.post('/telegram/send-otp', data)
    return response.data
  },

  // Verify OTP and get JWT token
  async verifyOTP(data: OTPVerifyRequest): Promise<AuthResponse> {
    const response = await api.post('/telegram/verify-otp', data)
    
    // Store token in secure cookie
    Cookies.set('auth_token', response.data.access_token, {
      expires: 7, // 7 days
      secure: true,
      sameSite: 'strict'
    })
    
    return response.data
  },

  // Get current user info
  async getCurrentUser(): Promise<UserData> {
    const response = await api.get('/auth/me')
    return response.data
  },

  // Refresh access token
  async refreshToken(): Promise<AuthResponse> {
    const response = await api.post('/auth/refresh')
    
    // Update token in cookie
    Cookies.set('auth_token', response.data.access_token, {
      expires: 7,
      secure: true,
      sameSite: 'strict'
    })
    
    return response.data
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } finally {
      // Always clear local storage
      Cookies.remove('auth_token')
    }
  }
}