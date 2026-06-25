import { configureStore } from '@reduxjs/toolkit';
import bikeReducer from './bikeSlice';
import tripReducer from './tripSlice';
import settingsReducer from './settingsSlice';
import statsReducer from './statsSlice';

export const store = configureStore({
  reducer: {
    bike: bikeReducer,
    trip: tripReducer,
    settings: settingsReducer,
    stats: statsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
