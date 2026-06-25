import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DiscoveredDevice {
  id: string;
  name: string;
}

interface BikeState {
  connected: boolean;
  connectedDevice: DiscoveredDevice | null;
  scanning: boolean;
  discoveredDevices: DiscoveredDevice[];
  simulated: boolean;
}

const initialState: BikeState = {
  connected: false,
  connectedDevice: null,
  scanning: false,
  discoveredDevices: [],
  simulated: false,
};

const bikeSlice = createSlice({
  name: 'bike',
  initialState,
  reducers: {
    setBikeConnected: (state, action: PayloadAction<{ id: string; name: string; simulated?: boolean }>) => {
      state.connected = true;
      state.connectedDevice = { id: action.payload.id, name: action.payload.name };
      state.simulated = !!action.payload.simulated;
    },
    setBikeDisconnected: (state) => {
      state.connected = false;
      state.connectedDevice = null;
      state.simulated = false;
    },
    setScanning: (state, action: PayloadAction<boolean>) => {
      state.scanning = action.payload;
      if (action.payload) {
        state.discoveredDevices = [];
      }
    },
    addDiscoveredDevice: (state, action: PayloadAction<DiscoveredDevice>) => {
      const exists = state.discoveredDevices.find(d => d.id === action.payload.id);
      if (!exists) {
        state.discoveredDevices.push(action.payload);
      }
    },
  },
});

export const { setBikeConnected, setBikeDisconnected, setScanning, addDiscoveredDevice } = bikeSlice.actions;
export default bikeSlice.reducer;
