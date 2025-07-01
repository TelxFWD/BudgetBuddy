import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ForwardingPair {
  id: number
  source_platform: string
  destination_platform: string
  source_account_id: number
  destination_account_id: number
  status: 'active' | 'paused' | 'error'
  created_at: string
}

interface ForwardingState {
  pairs: ForwardingPair[]
  socket: any
  isLoading: boolean
}

const initialState: ForwardingState = {
  pairs: [],
  socket: null,
  isLoading: false,
}

const forwardingSlice = createSlice({
  name: 'forwarding',
  initialState,
  reducers: {
    setPairs: (state, action: PayloadAction<ForwardingPair[]>) => {
      state.pairs = action.payload
    },
    addPair: (state, action: PayloadAction<ForwardingPair>) => {
      state.pairs.push(action.payload)
    },
    updatePair: (state, action: PayloadAction<ForwardingPair>) => {
      const index = state.pairs.findIndex(p => p.id === action.payload.id)
      if (index !== -1) {
        state.pairs[index] = action.payload
      }
    },
    removePair: (state, action: PayloadAction<number>) => {
      state.pairs = state.pairs.filter(p => p.id !== action.payload)
    },
    setSocket: (state, action: PayloadAction<any>) => {
      state.socket = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { setPairs, addPair, updatePair, removePair, setSocket, setLoading } = forwardingSlice.actions
export default forwardingSlice.reducer