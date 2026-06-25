import * as SQLite from 'expo-sqlite';

// Open SQLite database
const db = SQLite.openDatabaseSync('guerrilla.db');

// Initialize schema
export const initOfflineDatabase = () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS offline_trips (
        id TEXT PRIMARY KEY,
        userId TEXT,
        startTime TEXT,
        endTime TEXT,
        distance REAL,
        duration INTEGER,
        avgSpeed REAL,
        maxSpeed REAL,
        minSpeed REAL,
        startLat REAL,
        startLng REAL,
        endLat REAL,
        endLng REAL,
        terrainType TEXT,
        timeOfDay TEXT,
        routeGeoJSON TEXT,
        synced INTEGER DEFAULT 0
      );
    `);
    console.log('Offline SQLite DB initialized successfully');
  } catch (error) {
    console.error('Error initializing SQLite DB:', error);
  }
};

export interface OfflineTrip {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  terrainType: string;
  timeOfDay: string;
  routeGeoJSON: string; // JSON string of coordinates
  synced: number;
}

export const saveTripOffline = (trip: Omit<OfflineTrip, 'synced'>) => {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO offline_trips 
      (id, userId, startTime, endTime, distance, duration, avgSpeed, maxSpeed, minSpeed, startLat, startLng, endLat, endLng, terrainType, timeOfDay, routeGeoJSON, synced) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        trip.id,
        trip.userId,
        trip.startTime,
        trip.endTime,
        trip.distance,
        trip.duration,
        trip.avgSpeed,
        trip.maxSpeed,
        trip.minSpeed,
        trip.startLat,
        trip.startLng,
        trip.endLat,
        trip.endLng,
        trip.terrainType,
        trip.timeOfDay,
        trip.routeGeoJSON
      ]
    );
    console.log('Saved trip locally to SQLite cache:', trip.id);
  } catch (error) {
    console.error('Failed to save trip offline:', error);
  }
};

export const getUnsyncedTrips = (): OfflineTrip[] => {
  try {
    const results = db.getAllSync<OfflineTrip>(
      'SELECT * FROM offline_trips WHERE synced = 0'
    );
    return results;
  } catch (error) {
    console.error('Error getting unsynced trips:', error);
    return [];
  }
};

export const getAllLocalTrips = (): OfflineTrip[] => {
  try {
    const results = db.getAllSync<OfflineTrip>(
      'SELECT * FROM offline_trips ORDER BY startTime DESC'
    );
    return results;
  } catch (error) {
    console.error('Error getting all local trips:', error);
    return [];
  }
};

export const markTripSynced = (tripId: string) => {
  try {
    db.runSync('UPDATE offline_trips SET synced = 1 WHERE id = ?', [tripId]);
    console.log('Marked trip as synced in SQLite:', tripId);
  } catch (error) {
    console.error('Error marking trip as synced:', error);
  }
};
