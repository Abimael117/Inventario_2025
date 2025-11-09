
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
 * @param data The user data to update, must include role and permissions.
 * @returns An object indicating success or an error message.
 */
export async function updateUserAction(uid: string, data: Partial<Omit<User, 'id' | 'uid'>>) {
  try {
    initFirebaseAdminApp();
    const auth = getAuth();
    const firestore = getFirestore();
    const userDocRef = firestore.collection('users').doc(uid);

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
    
    // This is the payload to update the Firestore document.
    // It's built from the provided data.
    const firestoreUpdatePayload: { [key: string]: any } = {};

    if (data.name) firestoreUpdatePayload.name = data.name;
    if (data.username) firestoreUpdatePayload.username = data.username;
    
    // Always include role and permissions in the update payload.
    // The client should always send the full state of these.
    if (data.role) {
      firestoreUpdatePayload.role = data.role;
       if (data.role === 'admin') {
         // If role is admin, force all permissions.
         firestoreUpdatePayload.permissions = ['dashboard', 'inventory', 'loans', 'reports', 'settings'];
       } else {
         // If role is user, save the specific permissions array.
         firestoreUpdatePayload.permissions = data.permissions || [];
       }
    } else {
      // If role is not changing, still update permissions.
      if (data.permissions) {
        firestoreUpdatePayload.permissions = data.permissions;
      }
    }

    if (Object.keys(firestoreUpdatePayload).length > 0) {
        await userDocRef.update(firestoreUpdatePayload);
    }

    // After updating Firestore, ensure custom claims are in sync with the new role.
    if (data.role) {
        await auth.setCustomUserClaims(uid, { role: data.role });
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
    } else {
      message = error.message || message;
    }
    return { error: message };
  }
}
