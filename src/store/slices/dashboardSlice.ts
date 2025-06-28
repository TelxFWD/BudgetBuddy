import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DashboardState, UserStats, SystemHealth } from '@/types';
import { dashboardService } from '@/services/dashboardService';

const initialState: DashboardState = {
  stats: null,
  health: null,
  isLoading: false,
};

export const fetchUserStats = createAsyncThunk(
  'dashboard/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getUserStats();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user stats');
    }
  }
);

export const fetchSystemHealth = createAsyncThunk(
  'dashboard/fetchSystemHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getSystemHealth();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch system health');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateForwardingPairStatus: (state, action) => {
      const { pairId, status, lastForwarded } = action.payload;
      // Update forwarding pair status in real-time
      if (state.stats) {
        // Implementation will be added when we have forwarding pairs in stats
      }
    },
    updateStats: (state, action) => {
      const { queueStats } = action.payload;
      if (state.stats) {
        state.stats = { ...state.stats, ...queueStats };
      }
    },
    updateRealTimeMetrics: (state, action) => {
      const metrics = action.payload;
      if (state.stats) {
        state.stats = { ...state.stats, ...metrics };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchSystemHealth.fulfilled, (state, action) => {
        state.health = action.payload;
      });
  },
});

export const { updateForwardingPairStatus, updateStats, updateRealTimeMetrics } = dashboardSlice.actions;
export default dashboardSlice.reducer;