import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBMqYbInVSXbyVmkAfrNRCllXdVzEmisBg",
  authDomain: "cyber-lite-manager.firebaseapp.com",
  projectId: "cyber-lite-manager",
  storageBucket: "cyber-lite-manager.firebasestorage.app",
  messagingSenderId: "1029703230900",
  appId: "1:1029703230900:web:ea9be79caa0c6e1d3e7ee1",
  measurementId: "G-LQGZEN01M6",
  databaseURL: "https://cyber-lite-manager-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Primary app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app);

// Secondary app instance — used by Host to create admin accounts
// without signing out the currently logged-in host
let secondaryApp;
try {
  secondaryApp = initializeApp(firebaseConfig, 'Secondary');
} catch (e) {
  // already initialized
  secondaryApp = getApp('Secondary');
}
export { secondaryApp };
export const secondaryAuth = getAuth(secondaryApp);

export default app;
