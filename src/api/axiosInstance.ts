import axios from 'axios'

// Determine the correct base URL based on environment
const getBaseURL = (): string => {
  const isReplit = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app')
  
  if (isReplit) {
    // For Replit environment, always use direct API URL
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:5000/api`
  }
  
  // For local development, use proxy
  return '/api'
}

const baseURL = getBaseURL()

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 15000, // Increased timeout for Replit
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken
          })
          
          const { access_token } = response.data
          localStorage.setItem('access_token', access_token)
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return axiosInstance(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance