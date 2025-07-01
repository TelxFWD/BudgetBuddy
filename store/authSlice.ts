import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  isLoading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    loginSuccess: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true
      state.token = action.payload
      state.isLoading = false
      state.error = null
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.token = null
      state.isLoading = false
      state.error = null
    },
  },
})

export const { setLoading, setError, loginSuccess, logout } = authSlice.actions
export default authSlice.reducer