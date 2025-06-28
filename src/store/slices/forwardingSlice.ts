import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  ForwardingState, 
  ForwardingPair, 
  ForwardingPairCreate, 
  ForwardingPairUpdate,
  TelegramAccount,
  DiscordAccount,
  QueueStatus,
  SessionHealth,
  PlanLimits,
  BulkOperation
} from '@/types';
import { forwardingService } from '@/services/forwardingService';

const initialState: ForwardingState = {
  pairs: [],
  telegramAccounts: [],
  discordAccounts: [],
  selectedAccount: null,
  isLoading: false,
  error: null,
  queueStatus: null,
  sessionHealth: null,
  planLimits: null,
};

// Async thunks for forwarding pairs
export const fetchForwardingPairs = createAsyncThunk(
  'forwarding/fetchPairs',
  async () => {
    return await forwardingService.getForwardingPairs();
  }
);

export const createForwardingPair = createAsyncThunk(
  'forwarding/createPair',
  async (pairData: ForwardingPairCreate) => {
    return await forwardingService.createForwardingPair(pairData);
  }
);

export const updateForwardingPair = createAsyncThunk(
  'forwarding/updatePair',
  async ({ pairId, updates }: { pairId: number; updates: ForwardingPairUpdate }) => {
    return await forwardingService.updateForwardingPair(pairId, updates);
  }
);

export const deleteForwardingPair = createAsyncThunk(
  'forwarding/deletePair',
  async (pairId: number) => {
    await forwardingService.deleteForwardingPair(pairId);
    return pairId;
  }
);

export const pauseForwardingPair = createAsyncThunk(
  'forwarding/pausePair',
  async (pairId: number) => {
    return await forwardingService.pauseForwardingPair(pairId);
  }
);

export const resumeForwardingPair = createAsyncThunk(
  'forwarding/resumePair',
  async (pairId: number) => {
    return await forwardingService.resumeForwardingPair(pairId);
  }
);

export const bulkPairOperation = createAsyncThunk(
  'forwarding/bulkOperation',
  async (operation: BulkOperation) => {
    await forwardingService.bulkPairOperation(operation);
    return operation;
  }
);

// Async thunks for accounts
export const fetchTelegramAccounts = createAsyncThunk(
  'forwarding/fetchTelegramAccounts',
  async () => {
    return await forwardingService.getTelegramAccounts();
  }
);

export const fetchDiscordAccounts = createAsyncThunk(
  'forwarding/fetchDiscordAccounts',
  async () => {
    return await forwardingService.getDiscordAccounts();
  }
);

export const addTelegramAccount = createAsyncThunk(
  'forwarding/addTelegramAccount',
  async (phoneNumber: string) => {
    return await forwardingService.addTelegramAccount(phoneNumber);
  }
);

export const verifyTelegramOTP = createAsyncThunk(
  'forwarding/verifyTelegramOTP',
  async ({ phoneNumber, otpCode }: { phoneNumber: string; otpCode: string }) => {
    return await forwardingService.verifyTelegramOTP(phoneNumber, otpCode);
  }
);

export const removeTelegramAccount = createAsyncThunk(
  'forwarding/removeTelegramAccount',
  async (accountId: number) => {
    await forwardingService.removeTelegramAccount(accountId);
    return accountId;
  }
);

export const addDiscordAccount = createAsyncThunk(
  'forwarding/addDiscordAccount',
  async (discordToken: string) => {
    return await forwardingService.addDiscordAccount(discordToken);
  }
);

export const removeDiscordAccount = createAsyncThunk(
  'forwarding/removeDiscordAccount',
  async (accountId: number) => {
    await forwardingService.removeDiscordAccount(accountId);
    return accountId;
  }
);

// Async thunks for status
export const fetchQueueStatus = createAsyncThunk(
  'forwarding/fetchQueueStatus',
  async () => {
    return await forwardingService.getQueueStatus();
  }
);

export const fetchSessionHealth = createAsyncThunk(
  'forwarding/fetchSessionHealth',
  async () => {
    return await forwardingService.getSessionHealth();
  }
);

export const fetchPlanLimits = createAsyncThunk(
  'forwarding/fetchPlanLimits',
  async () => {
    return await forwardingService.getPlanLimits();
  }
);

const forwardingSlice = createSlice({
  name: 'forwarding',
  initialState,
  reducers: {
    setSelectedAccount: (state, action: PayloadAction<number | null>) => {
      state.selectedAccount = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updatePairStatus: (state, action: PayloadAction<{ pairId: number; status: any }>) => {
      const { pairId, status } = action.payload;
      const pair = state.pairs.find(p => p.id === pairId);
      if (pair) {
        pair.queue_status = status;
      }
    },
    updateSessionHealth: (state, action: PayloadAction<SessionHealth>) => {
      state.sessionHealth = action.payload;
      
      // Update account statuses based on session health
      action.payload.telegram_sessions && Object.entries(action.payload.telegram_sessions).forEach(([accountId, health]) => {
        const account = state.telegramAccounts.find(a => a.id === parseInt(accountId));
        if (account) {
          account.status = health.status as any;
        }
      });

      action.payload.discord_sessions && Object.entries(action.payload.discord_sessions).forEach(([accountId, health]) => {
        const account = state.discordAccounts.find(a => a.id === parseInt(accountId));
        if (account) {
          account.status = health.status as any;
        }
      });
    },
    updateQueueStatus: (state, action: PayloadAction<QueueStatus>) => {
      state.queueStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Forwarding pairs
    builder
      .addCase(fetchForwardingPairs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchForwardingPairs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pairs = action.payload;
      })
      .addCase(fetchForwardingPairs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch forwarding pairs';
      })
      .addCase(createForwardingPair.fulfilled, (state, action) => {
        state.pairs.push(action.payload);
      })
      .addCase(updateForwardingPair.fulfilled, (state, action) => {
        const index = state.pairs.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pairs[index] = action.payload;
        }
      })
      .addCase(deleteForwardingPair.fulfilled, (state, action) => {
        state.pairs = state.pairs.filter(p => p.id !== action.payload);
      })
      .addCase(pauseForwardingPair.fulfilled, (state, action) => {
        const index = state.pairs.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pairs[index] = action.payload;
        }
      })
      .addCase(resumeForwardingPair.fulfilled, (state, action) => {
        const index = state.pairs.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pairs[index] = action.payload;
        }
      })
      .addCase(bulkPairOperation.fulfilled, (state, action) => {
        const { action: operation, pair_ids } = action.payload;
        if (operation === 'delete') {
          state.pairs = state.pairs.filter(p => !pair_ids.includes(p.id));
        } else {
          state.pairs.forEach(pair => {
            if (pair_ids.includes(pair.id)) {
              pair.is_active = operation === 'resume';
            }
          });
        }
      });

    // Telegram accounts
    builder
      .addCase(fetchTelegramAccounts.fulfilled, (state, action) => {
        state.telegramAccounts = action.payload;
      })
      .addCase(verifyTelegramOTP.fulfilled, (state, action) => {
        state.telegramAccounts.push(action.payload);
      })
      .addCase(removeTelegramAccount.fulfilled, (state, action) => {
        state.telegramAccounts = state.telegramAccounts.filter(a => a.id !== action.payload);
      });

    // Discord accounts
    builder
      .addCase(fetchDiscordAccounts.fulfilled, (state, action) => {
        state.discordAccounts = action.payload;
      })
      .addCase(addDiscordAccount.fulfilled, (state, action) => {
        state.discordAccounts.push(action.payload);
      })
      .addCase(removeDiscordAccount.fulfilled, (state, action) => {
        state.discordAccounts = state.discordAccounts.filter(a => a.id !== action.payload);
      });

    // Status updates
    builder
      .addCase(fetchQueueStatus.fulfilled, (state, action) => {
        state.queueStatus = action.payload;
      })
      .addCase(fetchSessionHealth.fulfilled, (state, action) => {
        state.sessionHealth = action.payload;
      })
      .addCase(fetchPlanLimits.fulfilled, (state, action) => {
        state.planLimits = action.payload;
      });

    // Error handling for all async actions
    builder.addMatcher(
      (action) => action.type.endsWith('/rejected'),
      (state, action: any) => {
        state.isLoading = false;
        state.error = action.error?.message || 'An error occurred';
      }
    );
  },
});

export const { 
  setSelectedAccount, 
  clearError, 
  updatePairStatus, 
  updateSessionHealth, 
  updateQueueStatus 
} = forwardingSlice.actions;

export default forwardingSlice.reducer;