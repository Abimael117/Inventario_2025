
'use server';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';

// Use environment variables for service account credentials
const firebaseAdminConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function initializes a SEPARATE, temporary Firebase app instance
// with admin-like privileges for user creation.
// It uses a different name to avoid conflicts with the client-side app.
function initializeTemporaryAdminApp() {
  const adminAppName = 'firebase-admin-app-for-user-creation';
  const existingApp = getApps().find(app => app.name === adminAppName);
  if (existingApp) {
    return {
        auth: getAuth(existingApp),
        firestore: getFirestore(existingApp)
    };
  }
  
  const tempApp = initializeApp(firebaseAdminConfig, adminAppName);
  return {
      auth: getAuth(tempApp),
      firestore: getFirestore(tempApp)
  };
}


const DUMMY_DOMAIN = 'decd.local';

/**
 * Creates a new user in Firebase Authentication and Firestore.
 * This is a server action and should only be called from the server.
 * @param userData - The user data for the new user.
 * @returns An object with success status and a message or error.
 */
export async function createNewUser(
  userData: Omit<User, 'uid' | 'role'>
): Promise<{ success: boolean; message?: string; error?: string }> {
  
  try {
    // Initialize a temporary app for this server-side action
    const { auth: tempAuth, firestore: tempFirestore } = initializeTemporaryAdminApp();

    if (!userData.password || userData.password.length < 6) {
      return { success: false, error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
    }

    const email = `${userData.username}@${DUMMY_DOMAIN}`;

    // 1. Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, userData.password);
    const userRecord = userCredential.user;

    // 2. Create user profile in Firestore
    // Do NOT store the password in Firestore.
    const { password, ...userDataForFirestore } = userData;

    const userDocRef = doc(tempFirestore, 'users', userRecord.uid);
    await setDoc(userDocRef, {
      ...userDataForFirestore,
      uid: userRecord.uid,
      role: 'user', // Default role
      permissions: userData.permissions || [], // Use permissions from form
    });

    return { success: true, message: 'Usuario creado con éxito.' };

  } catch (error: any) {
    console.error('Error creating new user:', error);
    let errorMessage = 'Error desconocido al crear el usuario.';
    
    // Provide more specific error messages based on Firebase error codes
    if (error.code) {
        switch (error.code) {
        case 'auth/email-already-exists':
            errorMessage = 'Este nombre de usuario ya está en uso.';
            break;
        case 'auth/invalid-password':
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            break;
        case 'auth/invalid-email':
            errorMessage = 'El formato del nombre de usuario no es válido.';
            break;
        }
    } else if (error.message.includes('Server configuration error')) {
        errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}
