'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const DUMMY_DOMAIN = 'decd.local';


// --- ONE-TIME ADMIN USER SETUP ---
// This code will run once on the client to ensure the admin account exists.
const setupAdmin = async () => {
  const { auth, firestore } = initializeFirebase();
  const adminEmail = `admin@${DUMMY_DOMAIN}`;
  const adminPassword = 'Admin12345';

  try {
    // Try to sign in silently. If it works, the user exists.
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  } catch (error: any) {
    // If user not found, create it.
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      try {
        const { user: adminAuthUser } = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        const adminUserRef = doc(firestore, "users", adminAuthUser.uid);
        // Set the profile in Firestore.
        await setDoc(adminUserRef, {
            uid: adminAuthUser.uid,
            name: 'Administrador',
            username: 'admin',
            role: 'admin',
            permissions: ['dashboard', 'inventory', 'loans', 'reports', 'settings'],
        }, { merge: true });
      } catch (creationError: any) {
        // If it fails because it already exists (race condition), that's fine.
        if (creationError.code !== 'auth/email-already-in-use') {
           console.error("Failed to create admin user:", creationError);
        }
      }
    }
  }
};


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  useEffect(() => {
    setupAdmin();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
