
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
function initializeFirebaseServer(): { firebaseApp: FirebaseApp; firestore: ReturnType<typeof getFirestore>; auth: ReturnType<typeof getAuth>; } {
  // Use getApps() to check if Firebase has already been initialized.
  if (!getApps().length) {
    // If not initialized, initialize with the config object.
    // This is the correct approach for server-side code (Server Actions, API routes).
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }
  
  // If already initialized, get the existing app instance.
  const app = getApp();
  return getSdks(app);
}

// Helper function to get the SDKs from a FirebaseApp instance.
export function getSdks(firebaseApp?: FirebaseApp) {
    const app = firebaseApp || getApp(); // Ensure we have an app instance
    return {
        firebaseApp: app,
        auth: getAuth(app),
        firestore: getFirestore(app)
    };
}

// Initialize on server-side module load and export the SDKs.
const { firestore, auth, firebaseApp } = initializeFirebaseServer();

export { firestore, auth, firebaseApp };
