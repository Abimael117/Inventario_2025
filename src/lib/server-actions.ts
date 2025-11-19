
'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import type { User } from './types';
import 'dotenv/config';

const DUMMY_DOMAIN = 'decd.local';

/**
 * Initializes the Firebase Admin SDK, ensuring it's only done once.
 * This function is critical for server-side operations and uses explicit credentials.
 */
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        throw new Error("Las credenciales de servicio de Firebase no están configuradas en las variables de entorno (GOOGLE_APPLICATION_CREDENTIALS_JSON).");
      }
      
      const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e: any) {
      console.error("Firebase admin initialization error:", e.message);
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
 * This is a server action and should only be called from the server.
 *
 * @param uid - The UID of the user to delete.
 * @returns An object indicating success or failure with a message.
 */
export async function deleteExistingUser(uid: string) {
  try {
    initializeFirebaseAdmin();
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  try {
    // Step 1: Delete user from Firebase Authentication.
    // This might fail if the user was already deleted from Auth but not Firestore, so we catch it.
    await admin.auth().deleteUser(uid);
  } catch (error: any) {
    // If the error is 'user-not-found', it means the auth part is already gone.
    // We can ignore this and proceed to delete from Firestore.
    if (error.code !== 'auth/user-not-found') {
      console.error(`Failed to delete user from Auth (${uid}):`, error);
      // For other errors, we stop and report the issue.
      return { success: false, message: 'No se pudo eliminar el usuario del sistema de autenticación.' };
    }
     console.log(`Auth user ${uid} not found, proceeding to delete from Firestore.`);
  }

  try {
    // Step 2: Delete user profile from Firestore.
    // This is the crucial part that was failing before.
    await admin.firestore().collection('users').doc(uid).delete();
    
    revalidatePath('/settings');

    return { success: true, message: 'Usuario eliminado completamente del sistema.' };
  } catch (error: any) {
    console.error(`Failed to delete user profile from Firestore (${uid}):`, error);
    return { success: false, message: 'No se pudo eliminar el perfil del usuario de la base de datos.' };
  }
}
