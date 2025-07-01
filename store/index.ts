import { configureStore } from '@reduxjs/toolkit'
import authSlice from './authSlice'
import userSlice from './userSlice'
import forwardingSlice from './forwardingSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    forwarding: forwardingSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser', 'forwarding/setSocket'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch