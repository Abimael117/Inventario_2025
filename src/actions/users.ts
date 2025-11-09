
'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdminApp } from '@/firebase/server';
import type { User } from '@/lib/types';

/**
 * Ensures that the initial 'admin' and 'educacion' users exist in both
 * Firebase Auth and Firestore, creating them only if they are missing.
 * This server-side action is designed to be idempotent and safe to call multiple times.
 */
export async function ensureInitialUsers() {
    try {
        initFirebaseAdminApp();
        const auth = getAuth();
        const firestore = getFirestore();

        // --- User data definitions ---
        const adminUserData = {
            email: 'admin@decd.local',
            password: 'password123',
            displayName: 'Administrador',
            customClaims: { role: 'admin' },
            firestoreProfile: {
                name: 'Administrador',
                username: 'admin',
                role: 'admin' as const,
                permissions: ['dashboard', 'inventory', 'loans', 'reports', 'settings'],
            },
        };

        const educacionUserData = {
            email: 'educacion@decd.local',
            password: '123456',
            displayName: 'Centro educativo',
            customClaims: { role: 'user' },
            firestoreProfile: {
                name: 'Centro educativo',
                username: 'educacion',
                role: 'user' as const,
                permissions: ['dashboard', 'inventory', 'loans'],
            },
        };
        
        // --- Helper function to process each user ---
        const processUser = async (userData: typeof adminUserData) => {
            let uid: string;
            try {
                // 1. Check if user exists in Auth
                const userRecord = await auth.getUserByEmail(userData.email);
                uid = userRecord.uid;
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    // 2. If not, create user in Auth
                    const newUserRecord = await auth.createUser({
                        email: userData.email,
                        password: userData.password,
                        displayName: userData.displayName,
                    });
                    uid = newUserRecord.uid;
                    // Set custom claims if any
                    if (userData.customClaims) {
                        await auth.setCustomUserClaims(uid, userData.customClaims);
                    }
                } else {
                    // Rethrow other auth errors
                    throw error;
                }
            }

            // 3. Check if user profile exists in Firestore
            const userDocRef = firestore.collection('users').doc(uid);
            const docSnap = await userDocRef.get();

            if (!docSnap.exists) {
                // 4. If not, create profile in Firestore
                await userDocRef.set({ ...userData.firestoreProfile, uid });
            }
        };

        // --- Process both initial users ---
        await processUser(adminUserData);
        await processUser(educacionUserData);

        return { success: true };

    } catch (error: any) {
        console.error("Error ensuring initial users:", error);
        // This is a background task, so we don't want to throw an error to the user
        // unless absolutely necessary. We log it on the server.
        return { error: 'Failed to set up initial users on the server.' };
    }
}


/**
 * Updates a user's details in both Firebase Auth and Firestore.
 * This is a server-side action to ensure security.
 * @param uid The UID of the user to update.
 * @param data The user data to update.
 * @returns An object indicating success or an error message.
 */
export async function updateUserAction(uid: string, data: Partial<Omit<User, 'id' | 'uid'>>) {
  try {
    initFirebaseAdminApp();
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
    if (data.role) {
        firestoreUpdatePayload.role = data.role;
        // Also update the custom claim
        await auth.setCustomUserClaims(uid, { role: data.role });
    }
    
    if (Object.keys(firestoreUpdatePayload).length > 0) {
        const userDocRef = firestore.collection('users').doc(uid);
        await userDocRef.update(firestoreUpdatePayload);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error); // Log the full error on the server
    let message = 'No se pudo actualizar el usuario.';
    if (error.code === 'auth/user-not-found') {
        message = 'El usuario no fue encontrado en el sistema de autenticación.'
    } else if (error.code === 'auth/weak-password') {
      message = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
    } else if (error.code === 'auth/invalid-password') {
        message = 'La contraseña proporcionada no es válida.';
    }
    return { error: message };
  }
}
