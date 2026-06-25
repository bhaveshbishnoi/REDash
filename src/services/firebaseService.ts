import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getUnsyncedTrips, markTripSynced } from './offlineService';

export const syncOfflineTripsToFirebase = async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userId = user.uid;

  const unsynced = getUnsyncedTrips();
  if (unsynced.length === 0) return;

  console.log(`Syncing ${unsynced.length} trips to Firestore...`);

  for (const trip of unsynced) {
    try {
      const tripData = {
        startTime: trip.startTime,
        endTime: trip.endTime,
        distance: trip.distance,
        duration: trip.duration,
        avgSpeed: trip.avgSpeed,
        maxSpeed: trip.maxSpeed,
        minSpeed: trip.minSpeed,
        startLocation: { lat: trip.startLat, lng: trip.startLng },
        endLocation: { lat: trip.endLat, lng: trip.endLng },
        terrainType: trip.terrainType,
        timeOfDay: trip.timeOfDay,
        routeGeoJSON: JSON.parse(trip.routeGeoJSON),
      };

      // Set under trips/{userId}/trips/{tripId}
      await setDoc(doc(db, 'trips', userId, 'trips', trip.id), tripData);
      
      markTripSynced(trip.id);
    } catch (error) {
      console.warn(`Failed to sync trip ${trip.id} to Firestore:`, error);
    }
  }

  // Update aggregated user statistics
  await updateFirebaseStatsFromTrips();
};

export const updateFirebaseStatsFromTrips = async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userId = user.uid;

  try {
    const tripsCollection = collection(db, 'trips', userId, 'trips');
    const snapshot = await getDocs(tripsCollection);
    const trips = snapshot.docs.map(d => d.data());

    if (trips.length === 0) return;

    let totalDistance = 0;
    let totalRidingTime = 0;
    let maxSpeed = 0;
    let totalSpeedSum = 0;
    let totalCityRides = 0;
    let totalHighwayRides = 0;
    let totalDayRides = 0;
    let totalNightRides = 0;

    trips.forEach(t => {
      totalDistance += t.distance || 0;
      totalRidingTime += (t.duration || 0) / 60; // to minutes
      if (t.maxSpeed > maxSpeed) maxSpeed = t.maxSpeed;
      totalSpeedSum += t.avgSpeed || 0;
      
      if (t.terrainType === 'city') totalCityRides++;
      else totalHighwayRides++;

      if (t.timeOfDay === 'day') totalDayRides++;
      else totalNightRides++;
    });

    const avgSpeed = trips.length > 0 ? Math.round((totalSpeedSum / trips.length) * 10) / 10 : 0;
    const statsData = {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalRides: trips.length,
      totalRidingTime: Math.round(totalRidingTime),
      avgSpeed,
      bestSpeed: maxSpeed,
      totalFuelSpent: Math.round((totalDistance / 30) * 95), // mock calculations
      avgFuelEfficiency: 32.5,
      bestRideDistance: Math.max(...trips.map(t => t.distance || 0), 0),
      longestRideTime: Math.max(...trips.map(t => (t.duration || 0) / 60), 0),
      totalCityRides,
      totalHighwayRides,
      totalDayRides,
      totalNightRides,
      lastUpdated: new Date().toISOString()
    };

    await setDoc(doc(db, 'userStats', userId), statsData);
    console.log('Firebase user statistics aggregated and updated');
  } catch (error) {
    console.warn('Could not aggregate user stats in Firestore:', error);
  }
};

export const fetchWallpapers = async () => {
  try {
    // Provide nice preloaded mock wallpapers list since firestore storage is empty initially
    return [
      {
        id: 'wp1',
        title: 'Desert Guerrilla 450',
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
        category: 'bike',
      },
      {
        id: 'wp2',
        title: 'Mountain Pass',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
        category: 'landscape',
      },
      {
        id: 'wp3',
        title: 'Cyberpunk Neon Street',
        imageUrl: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=600&q=80',
        category: 'abstract',
      }
    ];
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    return [];
  }
};

export const saveUserSettings = async (settings: any) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await updateDoc(doc(db, 'users', user.uid), { settings });
  } catch (error) {
    console.warn('Could not save user settings to Firestore:', error);
  }
};
