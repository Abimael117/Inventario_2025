
'use server';

import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '@/lib/types';

// This pattern ensures the Admin SDK is initialized only once per server instance.
function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent errors
  if (getApps().length) {
    return {
      app: getApp(),
      auth: getAuth(),
      firestore: getFirestore(),
    };
  }

  try {
    // When running in a Google Cloud environment (like App Hosting),
    // the SDK can automatically detect the service account credentials.
    // No config object is needed.
    const app = initializeApp();
    return {
      app,
      auth: getAuth(app),
      firestore: getFirestore(app),
    };
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // Throw a more specific error that can be caught and handled.
    throw new Error('Server configuration error: Could not initialize Firebase Admin services.');
  }
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
    const { auth: adminAuth, firestore: adminFirestore } = initializeFirebaseAdmin();

    if (!userData.password || userData.password.length < 6) {
      return { success: false, error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
    }

    const email = `${userData.username}@${DUMMY_DOMAIN}`;

    // 1. Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: email,
      password: userData.password,
      displayName: userData.name,
    });

    // 2. Create user profile in Firestore
    // Do NOT store the password in Firestore.
    const { password, ...userDataForFirestore } = userData;

    const userDocRef = adminFirestore.collection('users').doc(userRecord.uid);
    await userDocRef.set({
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
