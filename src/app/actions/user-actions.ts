
'use server';

import * as admin from 'firebase-admin';
import type { User } from '@/lib/types';

// --- Firebase Admin SDK Initialization ---
// This pattern ensures the Admin SDK is initialized only once per server instance.
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      // When running in a Google Cloud environment (like App Hosting),
      // the SDK can automatically detect the service account credentials.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch (error: any) {
      console.error('Error al inicializar Firebase Admin SDK:', error);
      // This will cause subsequent operations to fail, which is expected
      // if the environment is not configured correctly.
    }
  }
  return admin;
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
  
  const admin = initializeFirebaseAdmin();
  
  if (admin.apps.length === 0) {
    return { success: false, error: 'Error de configuración del servidor. El SDK de Firebase no está inicializado. Revisa los logs.' };
  }
  
  if (!userData.password || userData.password.length < 6) {
    return { success: false, error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
  }

  const email = `${userData.username}@${DUMMY_DOMAIN}`;

  try {
    // 1. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: userData.password,
      displayName: userData.name,
    });

    // 2. Create user profile in Firestore
    // Do NOT store the password in Firestore.
    const { password, ...userDataForFirestore } = userData;

    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
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
