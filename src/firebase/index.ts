
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Initializes and returns Firebase SDK instances for client-side use.
 * Ensures that Firebase is initialized only once and sets session persistence.
 */
export function initializeFirebase(): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  // Set auth persistence to 'session'. This ensures the user has to log in
  // again when the browser or tab is closed.
  setPersistence(auth, browserSessionPersistence);

  return {
    firebaseApp: app,
    auth: auth,
    firestore: getFirestore(app),
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
// This export is no longer needed as the login page will use standard async functions
// export * from './non-blocking-login'; 
export * from './errors';
export * from './error-emitter';
