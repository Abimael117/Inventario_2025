
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
function initializeFirebaseServer(): { firebaseApp: FirebaseApp; firestore: ReturnType<typeof getFirestore>; auth: ReturnType<typeof getAuth>; } {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp),
    };
  }
  
  const app = getApp();
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

export function getSdks(firebaseApp?: FirebaseApp) {
    const app = firebaseApp || getApp();
    return {
        firebaseApp: app,
        auth: getAuth(app),
        firestore: getFirestore(app)
    };
}

// Initialize on server-side module load
const { firestore, auth, firebaseApp } = initializeFirebaseServer();

export { firestore, auth, firebaseApp };
