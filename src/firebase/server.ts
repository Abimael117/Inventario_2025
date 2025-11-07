
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Initializes and returns Firebase SDK instances for server-side use.
 * Ensures that Firebase is initialized only once.
 * This function should be called at the beginning of each Server Action
 * that needs to interact with Firebase.
 *
 * @returns An object containing the initialized `firestore`, `auth`, and `firebaseApp` instances.
 */
export function getSdks() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app)
  };
}
