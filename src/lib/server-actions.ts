
'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import type { User } from './types';
import 'dotenv/config';

const DUMMY_DOMAIN = 'decd.local';

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e: any) {
      console.error("Firebase admin initialization error:", e.message);
      // This will be caught by the calling function and reported to the user.
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
 * Deletes a user from Firebase Authentication and then from Firestore.
 * This function is designed to be robust.
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
        // Step 1: Attempt to delete from Firebase Authentication.
        await admin.auth().deleteUser(uid);
    } catch (error: any) {
        // If the user is not found in Auth, we log it but don't treat it as a failure,
        // because our goal is to ensure the user is removed from the system,
        // and this means they are already gone from the auth side.
        if (error.code === 'auth/user-not-found') {
            console.log(`User with UID ${uid} not found in Firebase Auth. Proceeding to delete from Firestore.`);
        } else {
            // For other auth errors, we should stop and report the problem.
            console.error("Error deleting user from Auth:", error);
            return { success: false, message: 'No se pudo eliminar el usuario de la autenticación.' };
        }
    }
    
    // Step 2: Delete from Firestore. This runs regardless of whether the user was in Auth,
    // ensuring the user profile is always removed from our database.
    try {
        const userDocRef = admin.firestore().collection('users').doc(uid);
        await userDocRef.delete();
        
        revalidatePath('/settings'); // Invalidate cache to reflect changes on the client.
        return { success: true, message: 'Usuario eliminado completamente.' };

    } catch (firestoreError: any) {
        console.error("Error deleting user from Firestore:", firestoreError);
        return { success: false, message: 'El usuario fue eliminado del acceso, pero no se pudo borrar el perfil de la base de datos.' };
    }
}
