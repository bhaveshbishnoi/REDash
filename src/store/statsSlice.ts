import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserStats {
  totalDistance: number;
  totalRides: number;
  totalRidingTime: number; // in minutes
  avgSpeed: number;
  bestSpeed: number;
  totalFuelSpent: number;
  avgFuelEfficiency: number;
  bestRideDistance: number;
  longestRideTime: number;
  totalCityRides: number;
  totalHighwayRides: number;
  totalDayRides: number;
  totalNightRides: number;
  lastUpdated: string | null;
}

const initialState: UserStats = {
  totalDistance: 0,
  totalRides: 0,
  totalRidingTime: 0,
  avgSpeed: 0,
  bestSpeed: 0,
  totalFuelSpent: 0,
  avgFuelEfficiency: 0,
  bestRideDistance: 0,
  longestRideTime: 0,
  totalCityRides: 0,
  totalHighwayRides: 0,
  totalDayRides: 0,
  totalNightRides: 0,
  lastUpdated: null,
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    setStats: (state, action: PayloadAction<UserStats>) => {
      return action.payload;
    },
    resetStats: () => initialState,
  },
});

export const { setStats, resetStats } = statsSlice.actions;
export default statsSlice.reducer;
