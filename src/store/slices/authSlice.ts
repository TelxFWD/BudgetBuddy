import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, AuthTokens, LoginRequest, TelegramOTPRequest, TelegramOTPVerify } from '@/types';
import { authService } from '@/services/authService';

const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const sendTelegramOTP = createAsyncThunk(
  'auth/sendTelegramOTP',
  async (data: TelegramOTPRequest, { rejectWithValue }) => {
    try {
      const response = await authService.sendTelegramOTP(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send OTP');
    }
  }
);

export const verifyTelegramOTP = createAsyncThunk(
  'auth/verifyTelegramOTP',
  async (data: TelegramOTPVerify, { rejectWithValue }) => {
    try {
      const response = await authService.verifyTelegramOTP(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'OTP verification failed');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get user info');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.error = null;
      authService.logout();
    },
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tokens = action.payload.tokens;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Send Telegram OTP
      .addCase(sendTelegramOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendTelegramOTP.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(sendTelegramOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Verify Telegram OTP
      .addCase(verifyTelegramOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyTelegramOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tokens = action.payload.tokens;
        state.user = action.payload.user;
      })
      .addCase(verifyTelegramOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Get Current User
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout, clearError, setTokens } = authSlice.actions;
export default authSlice.reducer;