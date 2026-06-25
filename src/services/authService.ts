import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const registerUser = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    // Create user document
    await setDoc(doc(db, 'users', userId), {
      email,
      name,
      bikeModel: 'Guerrilla 450',
      createdAt: new Date().toISOString(),
      settings: {
        themeMode: 'dark',
        wallpaperUrl: null,
        fuelType: 'petrol',
        notificationsEnabled: true
      }
    });
    
    // Create empty stats doc
    await setDoc(doc(db, 'userStats', userId), {
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
      lastUpdated: new Date().toISOString()
    });
    
    return { uid: userId, email, name };
  } catch (error: any) {
    console.error('Registration failed:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const listenToAuthChanges = (onUserLoaded: (user: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    onUserLoaded(user);
  });
};
