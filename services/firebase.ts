import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";

import { getAnalytics } from "firebase/analytics";

console.log("firebase.ts: Imports successful");

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app;
let db;
let auth;
let analytics;

try {
  console.log("firebase.ts: Initializing app...");
  app = initializeApp(firebaseConfig);
  console.log("firebase.ts: App initialized", app);

  analytics = getAnalytics(app);

  db = getFirestore(app);
  console.log("firebase.ts: Firestore initialized", db);

  auth = getAuth(app);
  console.log("firebase.ts: Auth initialized", auth);
} catch (error) {
  console.error("firebase.ts: Error initializing Firebase:", error);
}

export { db, auth };

/**
 * Submits user feedback to Firestore
 */
export const addFeedback = async (rating: number, comment: string) => {
  if (!db) throw new Error("Firestore not initialized");

  try {
    const feedbackRef = collection(db, "feedback");
    await addDoc(feedbackRef, {
      rating,
      comment,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
    });
    console.log("Feedback submitted successfully");
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
};

// Export Auth functions directly from the SDK
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
};
