
'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import type { User } from './types';
import { firebaseConfig } from '@/firebase/config';
import 'dotenv/config';

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // When GOOGLE_APPLICATION_CREDENTIALS is set, we don't need to pass any arguments to initializeApp.
    // It will automatically use the service account file.
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
 * Deletes a user from Firebase Authentication.
 * This function now ONLY handles the auth deletion. The Firestore deletion
 * will be handled by the client upon success.
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
        await admin.auth().deleteUser(uid);
        revalidatePath('/settings'); // Invalidate cache to reflect changes
        return { success: true, message: 'Usuario eliminado de la autenticación.' };
    } catch (error: any) {
        console.error("Error deleting user from Auth:", error);
        let message = 'No se pudo eliminar el usuario.';
        // If user is not found in auth, we can still consider it a "success"
        // for the purpose of deleting the Firestore record.
        if (error.code === 'auth/user-not-found') {
            console.log("User not found in auth, proceeding to delete from Firestore.");
            return { success: true, message: 'El usuario no existía en autenticación, se procederá a borrar el perfil.' };
        }
        return { success: false, message };
    }
}
