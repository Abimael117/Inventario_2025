'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
  const adminPassword = 'Admin12345'; // Use a secure, environment-managed password in production

  try {
    // Attempt to sign in. If it succeeds, the user exists and we do nothing.
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  } catch (error: any) {
    // If sign-in fails because the user is not found, we proceed to create it.
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      try {
        // Create the auth user
        const { user: adminAuthUser } = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        
        // Create the user profile document in Firestore
        const adminUserRef = doc(firestore, "users", adminAuthUser.uid);
        await setDoc(adminUserRef, {
            uid: adminAuthUser.uid,
            name: 'Administrador',
            username: 'admin',
            role: 'admin',
            permissions: ['dashboard', 'inventory', 'loans', 'reports', 'settings'],
        });
      } catch (creationError: any) {
        // This might fail in a race condition if another client is doing the same. 
        // If it's because the user now exists, we can safely ignore it.
        if (creationError.code !== 'auth/email-already-in-use') {
           console.error("Failed to create admin user during setup:", creationError);
        }
      }
    } else {
        // Log other sign-in errors for debugging, but don't crash.
        console.error("Error checking for admin user during setup:", error);
    }
  }
};


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  useEffect(() => {
    // We only run this setup once on initial client load.
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
