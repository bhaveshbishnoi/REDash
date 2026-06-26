import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import { calculateDistance } from '../utils/geoUtils';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
    db = await SQLite.openDatabaseAsync('guerrilla.db');

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            bikeModel TEXT DEFAULT 'Guerrilla 450',
            bikeNumber TEXT,
            createdAt INTEGER
        );
        CREATE TABLE IF NOT EXISTS trips (
            id TEXT PRIMARY KEY,
            userId TEXT,
            startTime INTEGER,
            endTime INTEGER,
            startLat REAL,
            startLng REAL,
            endLat REAL,
            endLng REAL,
            distance REAL,
            duration INTEGER,
            avgSpeed REAL,
            maxSpeed REAL,
            minSpeed REAL,
            terrainType TEXT,
            timeOfDay TEXT,
            fuelUsed REAL,
            fuelEfficiency REAL,
            routeGeoJSON TEXT,
            notes TEXT,
            imageUrl TEXT
        );
        CREATE TABLE IF NOT EXISTS trip_segments (
            id TEXT PRIMARY KEY,
            tripId TEXT,
            latitude REAL,
            longitude REAL,
            speed REAL,
            altitude REAL,
            timestamp INTEGER,
            FOREIGN KEY(tripId) REFERENCES trips(id)
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS wallpapers (
            id TEXT PRIMARY KEY,
            title TEXT,
            filePath TEXT,
            isSelected INTEGER DEFAULT 0,
            category TEXT
        );
    `);
    console.log("Database initialized");
};

export const startTrip = async () => {
  if (!db) await initDatabase();
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });

  const tripId = Math.random().toString(36).substr(2, 9);
  
  await db!.runAsync(
    'INSERT INTO trips (id, userId, startTime, startLat, startLng, terrainType, timeOfDay) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      tripId,
      'local_user',
      Date.now(),
      location.coords.latitude,
      location.coords.longitude,
      'city',
      new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'day' : 'night'
    ]
  );

  return tripId;
};

export const recordTripSegment = async (tripId: string, speed: number) => {
  if (!db) return;
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });

  const segmentId = Math.random().toString(36).substr(2, 9);

  await db.runAsync(
    'INSERT INTO trip_segments (id, tripId, latitude, longitude, speed, altitude, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      segmentId,
      tripId,
      location.coords.latitude,
      location.coords.longitude,
      speed,
      location.coords.altitude || 0,
      Date.now()
    ]
  );
};

export const endTrip = async (tripId: string) => {
  if (!db) return;
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });

  await db.runAsync(
    'UPDATE trips SET endTime=?, endLat=?, endLng=? WHERE id=?',
    [Date.now(), location.coords.latitude, location.coords.longitude, tripId]
  );

  await calculateTripStats(tripId);
};

const calculateTripStats = async (tripId: string) => {
  if (!db) return;
  const segments = await db.getAllAsync<any>('SELECT * FROM trip_segments WHERE tripId=? ORDER BY timestamp', [tripId]);
  
  if (segments.length < 2) return;

  let totalDistance = 0;
  let speeds: number[] = [];

  for (let i = 1; i < segments.length; i++) {
    const dist = calculateDistance(
      segments[i-1].latitude,
      segments[i-1].longitude,
      segments[i].latitude,
      segments[i].longitude
    );
    totalDistance += dist;
    speeds.push(segments[i].speed);
  }

  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 0;
  const duration = (segments[segments.length - 1].timestamp - segments[0].timestamp) / 60000;
  const terrainType = avgSpeed > 50 ? 'highway' : 'city';

  await db.runAsync(
    'UPDATE trips SET distance=?, avgSpeed=?, maxSpeed=?, minSpeed=?, duration=?, terrainType=? WHERE id=?',
    [totalDistance, Math.round(avgSpeed * 10) / 10, maxSpeed, minSpeed, duration, terrainType, tripId]
  );
};

export const getAllTrips = async () => {
  if (!db) await initDatabase();
  return await db!.getAllAsync('SELECT * FROM trips ORDER BY startTime DESC');
};
