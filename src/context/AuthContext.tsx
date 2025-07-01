import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axiosInstance from '../api/axiosInstance'
import { API_ENDPOINTS } from '../api/endpoints'
import { User, AuthContextType } from '../types'
import Cookies from 'js-cookie'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!token && !!user

  // Initialize auth state from localStorage/cookies
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token') || Cookies.get('token')
      
      if (storedToken) {
        setToken(storedToken)
        try {
          // Verify token and get user info
          const response = await axiosInstance.get(API_ENDPOINTS.AUTH.USER_INFO)
          setUser(response.data)
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('token')
          Cookies.remove('token')
          setToken(null)
        }
      }
      
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const sendOTP = async (phone: string): Promise<void> => {
    try {
      await axiosInstance.post(API_ENDPOINTS.AUTH.SEND_OTP, { phone_number: phone })
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to send OTP')
    }
  }

  const login = async (phone: string, otp: string): Promise<void> => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        phone_number: phone,
        otp_code: otp
      })

      const { access_token, user: userData } = response.data
      
      // Store token
      localStorage.setItem('token', access_token)
      Cookies.set('token', access_token, { expires: 7 }) // 7 days
      
      setToken(access_token)
      setUser(userData)
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = (): void => {
    localStorage.removeItem('token')
    Cookies.remove('token')
    setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    sendOTP,
    isLoading,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}