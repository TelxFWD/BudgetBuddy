import axios from 'axios';
import { AuthTokens, User, LoginRequest, TelegramOTPRequest, TelegramOTPVerify } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'autoforwardx_tokens';
const USER_KEY = 'autoforwardx_user';

export const authService = {
  async login(credentials: LoginRequest): Promise<{ tokens: AuthTokens; user: User }> {
    const response = await api.post('/auth/login', credentials);
    const { access_token, refresh_token, token_type, expires_in } = response.data;
    
    const tokens: AuthTokens = {
      access_token,
      refresh_token,
      token_type,
      expires_in,
    };
    
    this.setTokens(tokens);
    
    // Get user info
    const userResponse = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const user = userResponse.data;
    this.setUser(user);
    
    return { tokens, user };
  },

  async sendTelegramOTP(data: TelegramOTPRequest): Promise<void> {
    await api.post('/auth/telegram/send-otp', data);
  },

  async verifyTelegramOTP(data: TelegramOTPVerify): Promise<{ tokens: AuthTokens; user: User }> {
    const response = await api.post('/auth/telegram/verify-otp', data);
    const { access_token, refresh_token, token_type, expires_in } = response.data;
    
    const tokens: AuthTokens = {
      access_token,
      refresh_token,
      token_type,
      expires_in,
    };
    
    this.setTokens(tokens);
    
    // Get user info
    const userResponse = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const user = userResponse.data;
    this.setUser(user);
    
    return { tokens, user };
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    
    const tokens = response.data;
    this.setTokens(tokens);
    return tokens;
  },

  async getCurrentUser(): Promise<User> {
    const tokens = this.getTokens();
    if (!tokens) {
      throw new Error('No authentication tokens found');
    }
    
    const response = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    const user = response.data;
    this.setUser(user);
    return user;
  },

  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    }
  },

  getTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;
    
    const tokens = localStorage.getItem(TOKEN_KEY);
    return tokens ? JSON.parse(tokens) : null;
  },

  setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    return !!tokens?.access_token;
  },

  getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.access_token || null;
  },

  getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.refresh_token || null;
  },


};

// Setup request interceptor for auth token
api.interceptors.request.use((config) => {
  const tokens = authService.getTokens();
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

// Setup response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const tokens = authService.getTokens();
      if (tokens?.refresh_token) {
        try {
          const newTokens = await authService.refreshToken(tokens.refresh_token);
          // Retry the original request
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return api(originalRequest);
        } catch {
          authService.logout();
          window.location.href = '/login';
        }
      } else {
        authService.logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { api };