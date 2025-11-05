// firebase.ts (or .js)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAJdmB4GV8oZh9eZHHhq6zl86SQZuOg-y8",            // from Console → Project settings → General → Web app
  authDomain: "scnhitjournal.firebaseapp.com",
  projectId: "scnhitjournal",
  storageBucket: "scnhitjournal.appspot.com",               // <-- fixed
  messagingSenderId: "917854567717",
  appId: "1:917854567717:web:eeea01a64b4297e37feecc"
};

// guard against re-init during hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Singletons
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");  // explicit region is safer
