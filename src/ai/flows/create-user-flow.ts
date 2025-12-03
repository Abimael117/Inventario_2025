
'use server';
/**
 * @fileOverview A Genkit flow to create a new user in Firebase Authentication and Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Define input schema using Zod
const CreateUserInputSchema = z.object({
  name: z.string(),
  username: z.string(),
  password: z.string(),
  permissions: z.array(z.string()),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

const CreateUserOutputSchema = z.object({
  success: z.boolean(),
  uid: z.string().optional(),
  error: z.string().optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;


// --- ONE-TIME ADMIN SDK INITIALIZATION ---
if (!admin.apps.length) {
    try {
        console.log("Initializing Firebase Admin SDK in flow...");
        admin.initializeApp({
            projectId: firebaseConfig.projectId,
        });
        console.log("Firebase Admin SDK initialized successfully in flow.");
    } catch (e: any) {
        console.error("CRITICAL: Firebase Admin SDK initialization failed in flow.", e);
    }
}


const DUMMY_DOMAIN = 'decd.local';

// Define the flow
const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (input) => {
    const { username, password, name, permissions } = input;
    const email = `${username}@${DUMMY_DOMAIN}`;

    if (!admin.apps.length) {
      console.error('CRITICAL: Firebase Admin SDK is not initialized. The flow cannot proceed.');
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
        role: 'user',
        permissions: permissions,
      };

      // The document ID in 'users' collection is the UID
      await admin.firestore().collection('users').doc(uid).set(userProfile);

      console.log(`Successfully created user: ${username} (UID: ${uid})`);
      return { success: true, uid: uid };
    } catch (error: any) {
      console.error('Error creating user in createUserFlow:', error);
      
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
);

// Export a wrapper function to be called from the client
export async function createNewUser(input: CreateUserInput): Promise<CreateUserOutput> {
  return createUserFlow(input);
}
