import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  wallpaperUrl: string | null;
  themeMode: 'dark' | 'light';
  fuelType: string;
  fuelPricePerLiter: number;
  notificationsEnabled: boolean;
}

const initialState: SettingsState = {
  wallpaperUrl: null,
  themeMode: 'dark',
  fuelType: 'petrol',
  fuelPricePerLiter: 95,
  notificationsEnabled: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
    setWallpaper: (state, action: PayloadAction<string | null>) => {
      state.wallpaperUrl = action.payload;
    },
  },
});

export const { updateSettings, setWallpaper } = settingsSlice.actions;
export default settingsSlice.reducer;
