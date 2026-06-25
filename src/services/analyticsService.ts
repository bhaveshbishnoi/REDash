import { getAllLocalTrips } from './offlineService';

export const fetchAllTrips = async () => {
  // Read offline SQLite trips which represents the true source of truth (synced + unsynced)
  const trips = getAllLocalTrips();
  return trips.map(t => ({
    id: t.id,
    userId: t.userId,
    startTime: new Date(t.startTime),
    endTime: new Date(t.endTime),
    distance: t.distance,
    duration: t.duration,
    avgSpeed: t.avgSpeed,
    maxSpeed: t.maxSpeed,
    minSpeed: t.minSpeed,
    startLocation: { lat: t.startLat, lng: t.startLng },
    endLocation: { lat: t.endLat, lng: t.endLng },
    terrainType: t.terrainType,
    timeOfDay: t.timeOfDay,
    routeGeoJSON: JSON.parse(t.routeGeoJSON),
    synced: t.synced === 1,
  }));
};

export const getUserStats = async () => {
  const trips = await fetchAllTrips();
  
  if (trips.length === 0) {
    return {
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
    };
  }

  let totalDistance = 0;
  let totalDuration = 0;
  let bestSpeed = 0;
  let totalSpeed = 0;
  let totalCityRides = 0;
  let totalHighwayRides = 0;
  let totalDayRides = 0;
  let totalNightRides = 0;
  let bestRideDistance = 0;
  let longestRideTime = 0;

  trips.forEach(t => {
    totalDistance += t.distance;
    totalDuration += t.duration;
    if (t.maxSpeed > bestSpeed) bestSpeed = t.maxSpeed;
    totalSpeed += t.avgSpeed;
    
    if (t.terrainType === 'city') totalCityRides++;
    else totalHighwayRides++;

    if (t.timeOfDay === 'day') totalDayRides++;
    else totalNightRides++;

    if (t.distance > bestRideDistance) bestRideDistance = t.distance;
    const durationMins = t.duration / 60;
    if (durationMins > longestRideTime) longestRideTime = durationMins;
  });

  const avgSpeed = Math.round((totalSpeed / trips.length) * 10) / 10;
  const totalRidingTime = Math.round(totalDuration / 60);

  return {
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalRides: trips.length,
    totalRidingTime,
    avgSpeed,
    bestSpeed,
    totalFuelSpent: Math.round((totalDistance / 30) * 95),
    avgFuelEfficiency: 30 + Math.random() * 5, // mock km/l
    bestRideDistance: Math.round(bestRideDistance * 10) / 10,
    longestRideTime: Math.round(longestRideTime),
    totalCityRides,
    totalHighwayRides,
    totalDayRides,
    totalNightRides,
  };
};

export const getRidingPatterns = async () => {
  const trips = await fetchAllTrips();
  
  const patterns: any = {
    byDay: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 },
    byTimeOfDay: { day: 0, night: 0 },
    byTerrainType: { city: 0, highway: 0 }
  };
  
  trips.forEach(trip => {
    const dayName = new Date(trip.startTime).toLocaleDateString('en-US', { weekday: 'long' });
    if (patterns.byDay[dayName] !== undefined) {
      patterns.byDay[dayName]++;
    }
    
    if (trip.timeOfDay === 'day') patterns.byTimeOfDay.day++;
    else patterns.byTimeOfDay.night++;
    
    if (trip.terrainType === 'city') patterns.byTerrainType.city++;
    else patterns.byTerrainType.highway++;
  });
  
  return patterns;
};
