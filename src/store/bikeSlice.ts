import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BikeState {
  connected: boolean; // General connection state
  ssid: string | null;
  k1gConnected: boolean;
  scanning: boolean;
}

const initialState: BikeState = {
  connected: false,
  ssid: null,
  k1gConnected: false,
  scanning: false,
};

const bikeSlice = createSlice({
  name: 'bike',
  initialState,
  reducers: {
    setBikeConnected: (state, action: PayloadAction<{ ssid: string }>) => {
      state.connected = true;
      state.ssid = action.payload.ssid;
    },
    setK1gConnected: (state, action: PayloadAction<boolean>) => {
      state.k1gConnected = action.payload;
    },
    setBikeDisconnected: (state) => {
      state.connected = false;
      state.ssid = null;
      state.k1gConnected = false;
    },
    setScanning: (state, action: PayloadAction<boolean>) => {
      state.scanning = action.payload;
    },
  },
});

export const { setBikeConnected, setK1gConnected, setBikeDisconnected, setScanning } = bikeSlice.actions;
export default bikeSlice.reducer;
