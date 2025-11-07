'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Initializes and returns Firebase SDK instances for client-side use.
 * Ensures that Firebase is initialized only once.
 */
export function initializeFirebase() {
  // If no Firebase app has been initialized, initialize one.
  if (!getApps().length) {
    // In a standard client-side environment, you would use your firebaseConfig here.
    // This is the robust way to ensure initialization.
    initializeApp(firebaseConfig);
  }
  
  // Get the already initialized app and return its services.
  const firebaseApp = getApp();
  return getSdks(firebaseApp);
}

/**
 * Gets the SDK instances from a FirebaseApp instance.
 * @param firebaseApp The FirebaseApp instance.
 * @returns An object containing the Auth and Firestore SDKs.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';