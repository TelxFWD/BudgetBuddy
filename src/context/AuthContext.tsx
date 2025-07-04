
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance from '../api/axiosInstance';

interface User {
  id: number;
  username: string;
  email: string;
  plan: string;
  status: string;
  phone_number?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Set token in axios instance
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch user data
        await fetchUserData();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear invalid token
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axiosInstance.get('/api/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        throw new Error('Invalid user data');
      }
    } catch (error) {
      console.error('Fetch user data error:', error);
      throw error;
    }
  };

  const login = async (phone: string, otp: string) => {
    try {
      setIsLoading(true);
      
      // Token should already be stored by LoginPage
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token found');
      }

      // Set token in axios instance
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user data
      await fetchUserData();
      
    } catch (error) {
      console.error('Login error:', error);
      // Clear any stored tokens on login failure
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear user state
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear stored tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Clear axios header
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    // Clear any other stored data
    localStorage.removeItem('user_data');
    localStorage.removeItem('session_data');
  };

  const refreshUser = async () => {
    try {
      await fetchUserData();
    } catch (error) {
      console.error('Refresh user error:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
