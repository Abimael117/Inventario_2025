
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { DependencyList, useMemo } from 'react';

let firebaseApp: FirebaseApp;

// Simplified, idempotent initialization
if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      // This can happen in certain server-side rendering scenarios.
      // We fall back to the config object.
      if (process.env.NODE_ENV === "development") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
} else {
    firebaseApp = getApp();
}


export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
