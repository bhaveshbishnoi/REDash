import { saveTripOffline, OfflineTrip } from './offlineService';

let activeTrip: {
  tripId: string;
  startTime: string;
  startLat: number;
  startLng: number;
  speeds: number[];
  coordinates: { latitude: number; longitude: number }[];
} | null = null;

export const startTrip = async (startLat: number, startLng: number) => {
  const tripId = `trip_${Date.now()}`;
  activeTrip = {
    tripId,
    startTime: new Date().toISOString(),
    startLat,
    startLng,
    speeds: [],
    coordinates: [{ latitude: startLat, longitude: startLng }],
  };
  return tripId;
};

export const addTripSegment = async (latitude: number, longitude: number, speed: number) => {
  if (!activeTrip) return;
  activeTrip.speeds.push(speed);
  activeTrip.coordinates.push({ latitude, longitude });
};

export const endTrip = async (endLat: number, endLng: number, distance: number, duration: number) => {
  if (!activeTrip) throw new Error('No active trip to end');
  
  const userId = 'local_user';
  const endTime = new Date().toISOString();
  
  const speeds = activeTrip.speeds.length > 0 ? activeTrip.speeds : [0];
  const maxSpeed = Math.max(...speeds);
  const minSpeed = Math.min(...speeds);
  const avgSpeed = Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10;
  
  const terrainType = avgSpeed > 50 ? 'highway' : 'city';
  const timeOfDay = new Date(activeTrip.startTime).getHours() >= 6 && new Date(activeTrip.startTime).getHours() < 18 ? 'day' : 'night';

  const offlineTrip: OfflineTrip = {
    id: activeTrip.tripId,
    userId,
    startTime: activeTrip.startTime,
    endTime,
    distance,
    duration,
    avgSpeed,
    maxSpeed,
    minSpeed,
    startLat: activeTrip.startLat,
    startLng: activeTrip.startLng,
    endLat,
    endLng,
    terrainType,
    timeOfDay,
    routeGeoJSON: JSON.stringify(activeTrip.coordinates),
    synced: 1, // Offline-only app, so treat it as synced
  };

  // Save to SQLite
  saveTripOffline(offlineTrip);

  activeTrip = null;
  return offlineTrip;
};
