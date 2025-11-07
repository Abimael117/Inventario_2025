
'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdminApp } from '@/firebase/server';
import type { User } from '@/lib/types';

/**
 * Updates a user's details in both Firebase Auth and Firestore.
 * This is a server-side action to ensure security.
 * @param uid The UID of the user to update.
 * @param data The user data to update.
 * @returns An object indicating success or an error message.
 */
export async function updateUserAction(uid: string, data: Partial<Omit<User, 'id' | 'role' | 'uid'>>) {
  try {
    await initFirebaseAdminApp();
    const auth = getAuth();
    const firestore = getFirestore();

    const authUpdatePayload: { displayName?: string; password?: string } = {};
    if (data.name) {
      authUpdatePayload.displayName = data.name;
    }
    if (data.password) {
      authUpdatePayload.password = data.password;
    }

    // Update Firebase Auth if there's anything to update
    if (Object.keys(authUpdatePayload).length > 0) {
      await auth.updateUser(uid, authUpdatePayload);
    }
    
    // Update Firestore document
    const firestoreUpdatePayload: { [key: string]: any } = {};
    if (data.name) {
        firestoreUpdatePayload.name = data.name;
    }
    if (data.username) {
        firestoreUpdatePayload.username = data.username;
    }
    if (data.permissions) {
        firestoreUpdatePayload.permissions = data.permissions;
    }
    
    if (Object.keys(firestoreUpdatePayload).length > 0) {
        const userDocRef = firestore.collection('users').doc(uid);
        await userDocRef.update(firestoreUpdatePayload);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error);
    let message = 'No se pudo actualizar el usuario.';
    if (error.code === 'auth/weak-password') {
      message = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
    } else if (error.code === 'auth/user-not-found') {
        message = 'El usuario no fue encontrado en el sistema de autenticación.'
    }
    return { error: message };
  }
}
