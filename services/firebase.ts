import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
  apiKey: "AIzaSyCaMduUYlSEnbwlzwgMynyOCSWFjV1VRZQ",
  authDomain: "cureconnect-95fb6.firebaseapp.com",
  projectId: "cureconnect-95fb6",
  storageBucket: "cureconnect-95fb6.firebasestorage.app",
  messagingSenderId: "556570830516",
  appId: "1:556570830516:web:255bff9186e9f32b6719e1",
  measurementId: "G-SGBZ1LJS5R"
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

// Export Auth functions directly from the SDK
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
};
