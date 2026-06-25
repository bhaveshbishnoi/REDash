import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface TripSegment {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  altitude?: number;
  heading?: number;
}

interface TripState {
  active: boolean;
  tripId: string | null;
  startTime: string | null;
  distance: number; // in km
  duration: number; // in seconds
  speeds: number[];
  avgSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  terrainType: 'city' | 'highway';
  timeOfDay: 'day' | 'night';
  coordinates: Coordinates[];
  segments: TripSegment[];
}

const initialState: TripState = {
  active: false,
  tripId: null,
  startTime: null,
  distance: 0,
  duration: 0,
  speeds: [],
  avgSpeed: 0,
  maxSpeed: 0,
  minSpeed: 0,
  terrainType: 'city',
  timeOfDay: 'day',
  coordinates: [],
  segments: [],
};

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    startNewTrip: (state, action: PayloadAction<{ tripId: string; startTime: string }>) => {
      state.active = true;
      state.tripId = action.payload.tripId;
      state.startTime = action.payload.startTime;
      state.distance = 0;
      state.duration = 0;
      state.speeds = [];
      state.avgSpeed = 0;
      state.maxSpeed = 0;
      state.minSpeed = 0;
      state.terrainType = 'city';
      state.timeOfDay = new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'day' : 'night';
      state.coordinates = [];
      state.segments = [];
    },
    updateTripStats: (state, action: PayloadAction<{ speed: number; segment: TripSegment }>) => {
      if (!state.active) return;
      const { speed, segment } = action.payload;
      
      state.speeds.push(speed);
      state.segments.push(segment);
      state.coordinates.push({ latitude: segment.latitude, longitude: segment.longitude });
      
      // Calculate speeds
      state.maxSpeed = Math.max(state.maxSpeed, speed);
      if (state.speeds.length > 0) {
        state.minSpeed = Math.min(...state.speeds);
        state.avgSpeed = Math.round((state.speeds.reduce((a, b) => a + b, 0) / state.speeds.length) * 10) / 10;
      }
      
      // Classify terrain based on average speed
      state.terrainType = state.avgSpeed > 50 ? 'highway' : 'city';
    },
    incrementTripDuration: (state, action: PayloadAction<number>) => {
      if (state.active) {
        state.duration += action.payload;
      }
    },
    updateTripDistance: (state, action: PayloadAction<number>) => {
      if (state.active) {
        state.distance = Math.round((state.distance + action.payload) * 100) / 100;
      }
    },
    resetTrip: (state) => {
      return initialState;
    },
  },
});

export const { startNewTrip, updateTripStats, incrementTripDuration, updateTripDistance, resetTrip } = tripSlice.actions;
export default tripSlice.reducer;
