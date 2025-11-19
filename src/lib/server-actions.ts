
'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import type { User } from './types';
import 'dotenv/config';

const DUMMY_DOMAIN = 'decd.local';

/**
 * Initializes the Firebase Admin SDK, ensuring it's only done once.
 * This function is critical for server-side operations.
 */
function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent errors
  if (!admin.apps.length) {
    try {
      // Check if the required environment variable is set
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        throw new Error("Las credenciales de servicio de Firebase no están configuradas en las variables de entorno.");
      }
      
      // Parse the credentials from the environment variable
      const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      // Initialize the app with the provided credentials
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e: any) {
      console.error("Firebase admin initialization error:", e.message);
      // This generic error is shown to the user for security reasons
      throw new Error('Error interno del servidor: no se pudo conectar a los servicios de Firebase.');
    }
  }
}

/**
 * Creates a new user in Firebase Authentication and stores their profile in Firestore.
 * This is a server action and should only be called from the server.
 *
 * @param newUser - The user data for creation, including a plain-text password.
 * @returns An object indicating success or failure with a message.
 */
export async function createNewUser(newUser: Omit<User, 'id' | 'role' | 'uid'>) {
  try {
    initializeFirebaseAdmin();
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  const email = `${newUser.username}@${DUMMY_DOMAIN}`;

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: newUser.password!,
      displayName: newUser.name,
    });

    const userDocData: Omit<User, 'password'> = {
      uid: userRecord.uid,
      name: newUser.name,
      username: newUser.username,
      role: 'user',
      permissions: newUser.permissions || [],
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userDocData);
    
    revalidatePath('/settings');

    return { success: true, message: `Usuario "${newUser.username}" creado con éxito.` };
  } catch (error: any) {
    let message = 'No se pudo crear el usuario.';
    if (error.code === 'auth/email-already-exists') {
      message = 'Este nombre de usuario ya está en uso.';
    } else if (error.code === 'auth/invalid-password') {
        message = 'La contraseña no es válida. Debe tener al menos 6 caracteres.';
    }
    console.error("Error creating user:", error);
    return { success: false, message };
  }
}


/**
 * Deletes a user from Firebase Authentication and their profile from Firestore.
 * This is a server action designed to be called from the client.
 *
 * @param uid - The unique ID of the user to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteExistingUser(uid: string) {
  try {
    initializeFirebaseAdmin();
  } catch (error: any) {
     console.error("Error on delete init:", error.message);
    return { success: false, message: error.message };
  }

  try {
    // Step 1: Delete user from Firebase Authentication
    // We wrap this in a try-catch block to handle cases where the user
    // might have already been deleted from Auth but not Firestore.
    try {
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.warn(`User with UID ${uid} not found in Firebase Auth. Proceeding to delete from Firestore.`);
      } else {
        // For other auth errors, we re-throw to stop the process.
        throw error;
      }
    }

    // Step 2: Delete user profile from Firestore
    await admin.firestore().collection('users').doc(uid).delete();
    
    // Revalidate the path to update the user list on the client
    revalidatePath('/settings');
    return { success: true };

  } catch (error: any) {
    console.error(`Failed to completely delete user ${uid}:`, error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado durante la eliminación.' };
  }
}
