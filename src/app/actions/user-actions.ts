
'use server';

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '@/lib/types';
import { firebaseConfig } from '@/firebase/config';

// Helper function to initialize Firebase Admin SDK.
// It ensures the SDK is initialized only once.
function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent crashing.
  if (!admin.apps.length) {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // The Admin SDK needs credentials to be initialized.
    // If they are not available, we cannot proceed with admin operations.
    if (!privateKey || !clientEmail) {
        console.warn(
            "Firebase Admin SDK credentials (private key or client email) are not set in environment variables. " +
            "Server-side actions requiring admin privileges (like creating users) will fail. " +
            "Please set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL."
        );
        // We don't throw an error here to allow the rest of the app to function,
        // but admin-dependent features will be disabled.
        return null; 
    }

    // Initialize the app with credentials
    admin.initializeApp({
      credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: clientEmail,
          privateKey: privateKey
      }),
    });
  }
  return admin.app();
}

// Initialize outside the function scope to ensure it's called only once.
const adminApp = initializeFirebaseAdmin();

/**
 * Creates a new user in Firebase Authentication and Firestore using the Admin SDK.
 * This is a server action and should only be called from the server.
 * @param userData - The user data for the new user.
 * @returns An object with success status and a message or error.
 */
export async function createNewUser(
  userData: Omit<User, 'uid' | 'role'>
): Promise<{ success: boolean; message?: string; error?: string }> {
  
  if (!adminApp) {
      return { success: false, error: "El SDK de Firebase Admin no está inicializado. Revisa las credenciales del servidor." };
  }

  try {
    if (!userData.password || userData.password.length < 6) {
      return { success: false, error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
    }

    // The email is constructed for Firebase Auth but not exposed to the user.
    const email = `${userData.username}@decd.local`;

    // 1. Create user in Firebase Authentication using Admin SDK
    const userRecord = await admin.auth().createUser({
      email: email,
      password: userData.password,
      displayName: userData.name,
    });

    // 2. Create user profile in Firestore
    const firestore = getFirestore();
    const { password, ...userDataForFirestore } = userData;

    const userDocRef = firestore.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      ...userDataForFirestore,
      uid: userRecord.uid,
      role: 'user', // Default role for new users
      permissions: userData.permissions || [],
    });

    return { success: true, message: 'Usuario creado con éxito.' };

  } catch (error: any) {
    console.error('Error creating new user with Admin SDK:', error);
    let errorMessage = 'Error desconocido al crear el usuario.';
    
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
    }
    
    return { success: false, error: errorMessage };
  }
}
