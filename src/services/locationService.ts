import * as Location from 'expo-location';

let simulatedInterval: any = null;
let mockLat = 28.6139; // Start at New Delhi
let mockLng = 77.2090;

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;
  
  // Try requesting background permission (may fail on Expo Go without special config, we fail gracefully)
  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === 'granted';
  } catch (e) {
    console.log('Background permission request skipped or not supported:', e);
    return true;
  }
};

export const startLocationTracking = async (
  simulated: boolean,
  onLocationUpdate: (coords: { latitude: number; longitude: number; altitude: number | null; heading: number | null; accuracy: number | null }) => void
) => {
  if (simulated) {
    // Generate simulated coordinates following a path
    let angle = 0;
    simulatedInterval = setInterval(() => {
      // Create a nice winding route
      angle += 0.05;
      const speedFactor = 0.0005 + Math.random() * 0.0003;
      mockLat += Math.sin(angle) * speedFactor;
      mockLng += Math.cos(angle) * speedFactor;
      
      onLocationUpdate({
        latitude: mockLat,
        longitude: mockLng,
        altitude: 210 + Math.sin(angle) * 5,
        heading: (angle * 180) / Math.PI,
        accuracy: 5,
      });
    }, 2000);

    return () => {
      if (simulatedInterval) {
        clearInterval(simulatedInterval);
        simulatedInterval = null;
      }
    };
  }

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
    // Return default location if permission denied or fails
    return { latitude: 28.6139, longitude: 77.2090 };
  }
};
