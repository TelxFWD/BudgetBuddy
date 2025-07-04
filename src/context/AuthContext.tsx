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
      // Set axios header for authentication
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      // Verify token and get user info
      axiosInstance.get('/auth/me')
        .then(response => {
          setUser(response.data)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          delete axiosInstance.defaults.headers.common['Authorization']
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (phone: string) => {
    try {
      const response = await axiosInstance.post('/api/telegram/send-otp', { phone })
      return response.data
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to send OTP')
    }
  }

  const verifyOTP = async (phone: string, otp_code: string) => {
    try {
      const response = await axiosInstance.post('/api/telegram/verify-otp', { phone, otp: otp_code })
      const { access_token, refresh_token, user: userData } = response.data
      
      // Store tokens in localStorage
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      
      // Update axios default headers immediately
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      // Set user data
      setUser(userData)
    } catch (error: any) {
      console.error('OTP verification error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Invalid OTP')
    }
  }



  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    delete axiosInstance.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      verifyOTP,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}