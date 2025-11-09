
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
        
        const processUser = async (userData: typeof adminUserData) => {
            let uid: string;
            try {
                const userRecord = await auth.getUserByEmail(userData.email);
                uid = userRecord.uid;
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    const newUserRecord = await auth.createUser({
                        email: userData.email,
                        password: userData.password,
                        displayName: userData.displayName,
                    });
                    uid = newUserRecord.uid;
                } else {
                    // Re-throw other errors
                    throw error;
                }
            }
            
            // Now that we have a UID, set claims regardless of user existence before
            if (userData.customClaims) {
                await auth.setCustomUserClaims(uid, userData.customClaims);
            }

            const userDocRef = firestore.collection('users').doc(uid);
            const docSnap = await userDocRef.get();

            if (!docSnap.exists) {
                await userDocRef.set({ ...userData.firestoreProfile, uid });
            }
        };

        await processUser(adminUserData);
        await processUser(educacionUserData);

        return { success: true };

    } catch (error: any) {
        console.error("Error ensuring initial users:", error);
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

    if (Object.keys(authUpdatePayload).length > 0) {
      await auth.updateUser(uid, authUpdatePayload);
    }
    
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
        await auth.setCustomUserClaims(uid, { role: data.role });
    }
    
    if (Object.keys(firestoreUpdatePayload).length > 0) {
        const userDocRef = firestore.collection('users').doc(uid);
        await userDocRef.update(firestoreUpdatePayload);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error);
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

