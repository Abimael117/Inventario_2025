
'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import type { User } from './types';

// Centralized Firebase Admin SDK initialization function.
// It will only initialize the app if it hasn't been initialized yet.
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // This is the correct, robust way to initialize in a Google Cloud environment.
    // It automatically finds the service account credentials.
    admin.initializeApp();
  }
}

const DUMMY_DOMAIN = 'decd.local';

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
  } catch (e) {
    console.error("Failed to initialize Firebase Admin SDK", e);
    return { success: false, message: 'Error interno del servidor: no se pudo conectar a los servicios de Firebase.' };
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
      role: 'user', // All manually created users have the 'user' role
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
 *
 * @param uid - The UID of the user to delete.
 * @returns An object indicating success or failure with a message.
 */
export async function deleteExistingUser(uid: string) {
    try {
        initializeFirebaseAdmin();
    } catch (e) {
        console.error("Failed to initialize Firebase Admin SDK", e);
        return { success: false, message: 'Error interno del servidor: no se pudo conectar a los servicios de Firebase.' };
    }
    
    try {
        // Step 1: Delete the user from Firebase Authentication
        await admin.auth().deleteUser(uid);

        // Step 2: Delete the user's profile from Firestore
        const userDocRef = admin.firestore().collection('users').doc(uid);
        await userDocRef.delete();
        
        // Step 3: Revalidate the path to update the UI
        revalidatePath('/settings');

        return { success: true, message: 'Usuario eliminado permanentemente.' };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        let message = 'No se pudo eliminar el usuario.';
        if (error.code === 'auth/user-not-found') {
            message = 'El usuario no existe en el sistema de autenticación, pero se intentará borrar el perfil.';
            try {
                const userDocRef = admin.firestore().collection('users').doc(uid);
                await userDocRef.delete();
                revalidatePath('/settings');
                return { success: true, message: 'Se eliminó el perfil del usuario (ya no existía en autenticación).' };
            } catch (dbError) {
                 return { success: false, message: 'El usuario no existe ni en autenticación ni en la base de datos.' };
            }
        }
        return { success: false, message };
    }
}
