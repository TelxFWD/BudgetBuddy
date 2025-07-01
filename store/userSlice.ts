import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: number
  username: string
  email: string
  plan: 'free' | 'pro' | 'elite'
  status: string
  created_at: string
}

interface UserState {
  user: User | null
  limits: {
    max_pairs: number
    max_accounts: number
    features: string[]
  } | null
}

const initialState: UserState = {
  user: null,
  limits: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ user: User; limits: any }>) => {
      state.user = action.payload.user
      state.limits = action.payload.limits
    },
    clearUser: (state) => {
      state.user = null
      state.limits = null
    },
  },
})

export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer