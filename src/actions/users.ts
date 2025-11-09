
'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdminApp } from '@/firebase/server';
import type { User } from '@/lib/types';

// Initialize Firebase Admin SDK once when the module is loaded
initFirebaseAdminApp();

/**
 * Ensures that the initial 'admin' and 'educacion' users exist in both
 * Firebase Auth and Firestore, creating them only if they are missing.
 * This server-side action is idempotent and safe to call multiple times.
 */
export async function ensureInitialUsers() {
    try {
        const auth = getAuth();
        const firestore = getFirestore();

        const processUser = async (userData: any) => {
            let userRecord;
            
            // 1. Check if user exists in Auth. Create if not.
            try {
                userRecord = await auth.getUserByEmail(userData.email);
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    userRecord = await auth.createUser({
                        email: userData.email,
                        password: userData.password,
                        displayName: userData.displayName,
                    });
                } else {
                    // Re-throw other auth errors
                    throw error;
                }
            }
            
            const uid = userRecord.uid;

            // 2. Set Custom Claims in Auth
            await auth.setCustomUserClaims(uid, userData.customClaims);

            // 3. Check if user profile exists in Firestore. Create if not.
            const userDocRef = firestore.collection('users').doc(uid);
            const docSnap = await userDocRef.get();

            if (!docSnap.exists) {
                await userDocRef.set({ ...userData.firestoreProfile, uid });
            }
        };

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
export async function updateUserAction(uid: string, data: Partial<Omit<User, 'id' | 'uid' | 'password'>>) {
  try {
    const auth = getAuth();
    const firestore = getFirestore();
    const userDocRef = firestore.collection('users').doc(uid);

    const firestoreUpdatePayload: { [key: string]: any } = {};

    // Build the payload for Firestore update
    if (data.name) {
      firestoreUpdatePayload.name = data.name;
    }
    
    // Always update permissions. If it's undefined or null, it becomes an empty array.
    firestoreUpdatePayload.permissions = Array.isArray(data.permissions) ? data.permissions : [];
    
    // This logic handles a potential 'role' field, although it's not currently in the UI.
    if (data.role) {
       firestoreUpdatePayload.role = data.role;
       // Admins get all permissions.
       if (data.role === 'admin') {
         firestoreUpdatePayload.permissions = ['dashboard', 'inventory', 'loans', 'reports', 'settings'];
       }
    }

    // Perform the Firestore update if there's anything to update
    if (Object.keys(firestoreUpdatePayload).length > 0) {
      await userDocRef.update(firestoreUpdatePayload);
    }
    
    // Update Auth display name if provided
    if (data.name) {
      await auth.updateUser(uid, { displayName: data.name });
    }

    // Update Auth custom claims (role) if provided
    if (data.role) {
      await auth.setCustomUserClaims(uid, { role: data.role });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error);
    let message = 'No se pudo actualizar el usuario.';
    if (error.code === 'auth/user-not-found') {
      message = 'El usuario no fue encontrado en el sistema de autenticación.';
    } else if (error.message) {
      message = error.message;
    }
    return { error: message };
  }
}
