'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const DUMMY_DOMAIN = 'decd.local';

// --- ONE-TIME ADMIN SETUP ---
// This code will run once to ensure the admin account exists with a known password.
// It will be commented out after the first successful run.
const setupAdmin = async () => {
  // --- Start of one-time execution block ---
  const { auth, firestore } = initializeFirebase();
  const adminEmail = `admin@${DUMMY_DOMAIN}`;
  const adminPassword = 'Admin12345'; // Set a strong, temporary password

  try {
    // Try to sign in first to see if the user exists
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("Admin user already exists and password is correct.");
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      console.log("Admin user not found or password incorrect, attempting to create/update...");
      try {
        // If user does not exist or password is wrong, try to create it.
        // This will fail if the user exists but password is wrong, which is fine.
        // For a real reset, one would need backend functions. Here we just ensure creation.
        const { user: adminAuthUser } = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log("Admin user created in Auth.");
        const adminUserRef = doc(firestore, "users", adminAuthUser.uid);
        await setDoc(adminUserRef, {
            uid: adminAuthUser.uid,
            name: 'Administrador',
            username: 'admin',
            role: 'admin',
            permissions: ['dashboard', 'inventory', 'loans', 'reports', 'settings'],
        }, { merge: true });
        console.log("Admin profile created/updated in Firestore.");
      } catch (creationError: any) {
        if (creationError.code === 'auth/email-already-in-use') {
           console.warn("Admin user already exists in Auth, but the provided password was incorrect. You must reset the password in the Firebase Console.");
        } else {
           console.error("Failed to create admin user:", creationError);
        }
      }
    }
  }
  // --- End of one-time execution block ---
};


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  useEffect(() => {
    // Uncomment the line below to run the admin setup.
    // After running once successfully, this file will be updated to comment it out again.
    // setupAdmin();
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
