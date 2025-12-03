
'use server';

import * as admin from 'firebase-admin';
import type { User } from '@/lib/types';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK only if it hasn't been initialized yet.
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
      try {
        // When running in a Google Cloud environment, the SDK can auto-discover credentials.
        // For local development, you would set the GOOGLE_APPLICATION_CREDENTIALS env var.
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: firebaseConfig.projectId,
        });
      } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
        // Throw an error to make it clear that initialization failed. This prevents
        // subsequent operations from failing with a generic "unknown error".
        throw new Error('Failed to initialize Firebase Admin SDK. Check server logs for details.');
      }
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
  
  initializeFirebaseAdmin();

  if (!userData.password || userData.password.length < 6) {
    return { success: false, error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
  }

  const email = `${userData.username}@${DUMMY_DOMAIN}`;

  try {
    // 1. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password: userData.password,
      displayName: userData.name,
    });

    // 2. Create user profile in Firestore
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      name: userData.name,
      username: userData.username,
      role: 'user', // Default role
      permissions: userData.permissions || [], // Use permissions from form
    });

    return { success: true, message: 'Usuario creado con éxito.' };

  } catch (error: any) {
    console.error('Error creating new user:', error);
    let errorMessage = 'Error desconocido al crear el usuario.';
    
    // Provide more specific error messages based on Firebase error codes
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
      // Handle case where SDK might not have been initialized due to env issues
      case 'app/no-app':
        errorMessage = 'Error de configuración del servidor. No se pudo conectar con los servicios de Firebase.';
        break;
    }
    
    return { success: false, error: errorMessage };
  }
}
