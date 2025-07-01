import React, { createContext, useContext, useEffect, useState } from 'react'
import axiosInstance from '../api/axiosInstance'

interface User {
  id: number
  username: string
  email: string
  plan: 'Free' | 'Pro' | 'Elite'
  status: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (phone: string) => Promise<void>
  verifyOTP: (phone: string, otp: string) => Promise<void>
  demoLogin: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      // Verify token and get user info
      axiosInstance.get('/auth/me')
        .then(response => {
          setUser(response.data)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      // Auto-login for development testing
      if (process.env.NODE_ENV === 'development' && !localStorage.getItem('skip_auto_login')) {
        demoLogin().catch(() => {
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  const login = async (phone: string) => {
    try {
      await axiosInstance.post('/telegram/send-otp', { phone })
    } catch (error) {
      throw new Error('Failed to send OTP')
    }
  }

  const verifyOTP = async (phone: string, otp: string) => {
    try {
      const response = await axiosInstance.post('/telegram/verify-otp', { phone, otp })
      const { access_token, refresh_token, user: userData } = response.data
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      setUser(userData)
    } catch (error) {
      throw new Error('Invalid OTP')
    }
  }

  const demoLogin = async () => {
    try {
      const response = await axiosInstance.post('/auth/demo-login')
      const { access_token, refresh_token } = response.data
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      
      // Get user info
      const userResponse = await axiosInstance.get('/auth/me')
      setUser(userResponse.data)
    } catch (error) {
      throw new Error('Demo login failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      verifyOTP,
      demoLogin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}