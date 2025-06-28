import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';

export interface MessageVolumeData {
  date: string;
  message_count: number;
  success_count: number;
  error_count: number;
}

export interface ErrorData {
  type: string;
  message: string;
  count: number;
}

export interface UserStats {
  active_pairs: number;
  total_messages_forwarded: number;
  messages_today: number;
  messages_this_week: number;
  success_rate: number;
  avg_delay: number;
}

export interface AnalyticsState {
  stats: UserStats | null;
  messageVolume: MessageVolumeData[];
  errorSummary: ErrorData[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  stats: null,
  messageVolume: [],
  errorSummary: [],
  isLoading: false,
  error: null
};

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/analytics/user');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch analytics');
    }
  }
);

export const fetchMessageVolume = createAsyncThunk(
  'analytics/fetchMessageVolume',
  async ({ days = 7 }: { days?: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/analytics/message-volume?days=${days}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch message volume');
    }
  }
);

export const fetchErrorSummary = createAsyncThunk(
  'analytics/fetchErrorSummary',
  async ({ days = 7 }: { days?: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/analytics/errors?days=${days}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch error summary');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Analytics
      .addCase(fetchAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action: PayloadAction<UserStats>) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Message Volume
      .addCase(fetchMessageVolume.fulfilled, (state, action: PayloadAction<MessageVolumeData[]>) => {
        state.messageVolume = action.payload;
      })
      .addCase(fetchMessageVolume.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Fetch Error Summary
      .addCase(fetchErrorSummary.fulfilled, (state, action: PayloadAction<ErrorData[]>) => {
        state.errorSummary = action.payload;
      })
      .addCase(fetchErrorSummary.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;