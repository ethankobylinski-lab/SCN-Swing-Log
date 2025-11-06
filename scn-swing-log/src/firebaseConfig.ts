// src/firebaseConfig.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  RecaptchaVerifier,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "firebase/functions";

// --- Firebase Config (from .env.local)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// --- Initialize app (avoid re-init during hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// --- Auth
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

// --- Firestore
export const db = getFirestore(app);

// --- Cloud Functions (region must match your deploy)
const FUNCTIONS_REGION = import.meta.env.VITE_FUNCTIONS_REGION || "us-central1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

// --- Emulator setup (optional for local testing)
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  console.warn("⚠️ Using Firebase Emulators");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// --- ensureRecaptcha helper for phone auth
declare global {
  interface Window {
    _recaptchaVerifier?: RecaptchaVerifier;
  }
}

export function ensureRecaptcha(): RecaptchaVerifier {
  let el = document.getElementById("recaptcha-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "recaptcha-container";
    document.body.appendChild(el);
  }

  if (!window._recaptchaVerifier) {
    window._recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "invisible" }
    );
  }

  return window._recaptchaVerifier!;
}

export default app;
