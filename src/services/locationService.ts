import * as Location from 'expo-location';

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;
  
  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === 'granted';
  } catch (e) {
    console.log('Background permission request skipped or not supported:', e);
    return true;
  }
};

export const startLocationTracking = async (
  onLocationUpdate: (coords: { latitude: number; longitude: number; altitude: number | null; heading: number | null; accuracy: number | null }) => void
) => {
  // Real GPS Location tracking
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 5,
    },
    (location) => {
      onLocationUpdate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        accuracy: location.coords.accuracy,
      });
    }
  );

  return () => {
    subscription.remove();
  };
};

export const getCurrentPosition = async () => {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch (e) {
    return { latitude: 28.6139, longitude: 77.2090 };
  }
};
