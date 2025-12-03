
'use server';
/**
 * @fileOverview Server Action to create a new user in Firebase Authentication and Firestore.
 */

import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Define the shape of the user input
interface CreateUserInput {
  name: string;
  username: string;
  password: string;
  permissions: string[];
}

// --- ONE-TIME ADMIN SDK INITIALIZATION ---
// This block ensures the Admin SDK is initialized only once per server instance.
if (!admin.apps.length) {
    try {
        console.log("Initializing Firebase Admin SDK in Server Action...");
        // Initialize with default credentials from the environment.
        admin.initializeApp({
            projectId: firebaseConfig.projectId,
        });
        console.log("Firebase Admin SDK initialized successfully in Server Action.");
    } catch (e: any) {
        console.error("CRITICAL: Firebase Admin SDK initialization failed in Server Action.", e);
        // This is a critical failure, subsequent calls will fail.
    }
}

const DUMMY_DOMAIN = 'decd.local';

/**
 * Creates a new user in Firebase Authentication and a corresponding profile in Firestore.
 * This is a Server Action and will only execute on the server.
 * @param input - The user data for creation.
 * @returns An object indicating success or failure.
 */
export async function createNewUser(input: CreateUserInput) {
    const { username, password, name, permissions } = input;
    const email = `${username}@${DUMMY_DOMAIN}`;

    if (!admin.apps.length) {
        console.error('CRITICAL: Firebase Admin SDK is not initialized. The action cannot proceed.');
        return { success: false, error: 'El servicio de administración de Firebase no está inicializado. Contacta al soporte.' };
    }
    
    try {
      // Step 1: Create the user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: name,
      });

      const uid = userRecord.uid;

      // Step 2: Create the user profile in Firestore
      const userProfile = {
        uid: uid,
        name: name,
        username: username,
        role: 'user', // All users created through this action are 'user' role
        permissions: permissions,
      };

      // The document ID in 'users' collection is the UID
      await admin.firestore().collection('users').doc(uid).set(userProfile);

      console.log(`Successfully created user: ${username} (UID: ${uid})`);
      return { success: true, uid: uid };

    } catch (error: any) {
      console.error('Error creating user in Server Action:', error);
      
      let errorMessage = 'Ocurrió un error inesperado al crear el usuario.';
      if (error.code === 'auth/email-already-exists') {
        errorMessage = `El nombre de usuario "${username}" ya existe. El email derivado "${email}" ya está en uso.`;
      } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'La contraseña no es válida. Debe tener al menos 6 caracteres.';
      } else if (error.code === 'unavailable' || error.code === 'auth/internal-error') {
         errorMessage = 'El servicio de autenticación no está disponible o falló. Revisa la conexión del servidor y los logs.';
      }
      return { success: false, error: errorMessage };
    }
}

    