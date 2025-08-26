// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Generate unique user ID
const getUserId = () => {
  let userId = localStorage.getItem('streakTracker_userId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('streakTracker_userId', userId);
  }
  return userId;
};

// Database functions
export const saveStreakData = async (streakData) => {
  const userId = getUserId();
  try {
    await set(ref(database, `streaks/${userId}`), {
      ...streakData,
      lastUpdated: new Date().toISOString()
    });
    console.log('Data saved to Firebase');
  } catch (error) {
    console.error('Error saving to Firebase:', error);
    throw error;
  }
};

export const loadStreakData = async () => {
  const userId = getUserId();
  try {
    const snapshot = await get(ref(database, `streaks/${userId}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('Data loaded from Firebase:', data);
      return data;
    } else {
      console.log('No data found, starting fresh');
      return { streak: 0, lastCompleted: null };
    }
  } catch (error) {
    console.error('Error loading from Firebase:', error);
    throw error;
  }
};

export const subscribeToStreakData = (callback) => {
  const userId = getUserId();
  const streakRef = ref(database, `streaks/${userId}`);
  return onValue(streakRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};

export { getUserId };