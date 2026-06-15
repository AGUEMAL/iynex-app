import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYAQlHOQEfhpE4ZabUcq2hyaGd0srpGJA",
  authDomain: "iynex-26a11.firebaseapp.com",
  projectId: "iynex-26a11",
  storageBucket: "iynex-26a11.firebasestorage.app",
  messagingSenderId: "220518412647",
  appId: "1:220518412647:web:8688cbf51bacaad283ffc2",
  measurementId: "G-3JKF50V6QW",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Persist sessions across reloads / app restarts (Capacitor/web).
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* fallback handled by SDK */
  });
}

export const ADMIN_EMAIL = "iyadaguemal@gmail.com";
export const isAdminEmail = (email?: string | null) =>
  !!email && email.toLowerCase() === ADMIN_EMAIL;
