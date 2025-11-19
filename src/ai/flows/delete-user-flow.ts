'use server';
/**
 * @fileOverview A Genkit flow for deleting a Firebase user.
 *
 * This flow takes a user's UID, deletes them from Firebase Authentication,
 * and then deletes their corresponding document from the Firestore 'users' collection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Ensure the SDK is initialized only once.
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            projectId: firebaseConfig.projectId,
        });
    } catch (e: any) {
        console.error("Error crítico de inicialización de Firebase Admin en el flow:", e.message);
    }
}

const deleteUserInputSchema = z.object({
  uid: z.string().describe('The UID of the user to delete.'),
});
export type DeleteUserInput = z.infer<typeof deleteUserInputSchema>;

const deleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserOutput = z.infer<typeof deleteUserOutputSchema>;

export async function deleteUser(input: DeleteUserInput): Promise<DeleteUserOutput> {
  return deleteUserFlow(input);
}

const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: deleteUserInputSchema,
    outputSchema: deleteUserOutputSchema,
  },
  async ({ uid }) => {
    if (!admin.apps.length) {
      const errorMessage = 'Error interno del servidor: no se pudo conectar a los servicios de Firebase.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      // Step 1: Delete the user from Firebase Authentication.
      // This will throw an error if the user does not exist, which we can catch.
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      // If the user is not found in Auth, it's not a critical failure.
      // We still want to proceed to delete them from Firestore.
      if (error.code !== 'auth/user-not-found') {
        console.error(`Error al eliminar el usuario de Auth (UID: ${uid}):`, error);
        throw new Error('No se pudo eliminar el usuario del sistema de autenticación.');
      }
      console.log(`Usuario no encontrado en Auth (UID: ${uid}), se procederá a eliminar de Firestore.`);
    }

    try {
      // Step 2: Delete the user's document from the 'users' collection in Firestore.
      await admin.firestore().collection('users').doc(uid).delete();
    } catch (error: any) {
      console.error(`Error al eliminar el documento de Firestore (UID: ${uid}):`, error);
      throw new Error('No se pudo eliminar el perfil del usuario de la base de datos.');
    }
    
    // If both operations succeed (or the first one "succeeds" by user not existing), return success.
    return {
      success: true,
      message: 'Usuario eliminado con éxito.',
    };
  }
);
