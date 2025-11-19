
'use server';
/**
 * @fileOverview A flow for deleting a Firebase user and their associated data.
 * - deleteUser: Deletes a user from Firebase Auth and their profile from Firestore.
 * - DeleteUserInput: The input type for the deleteUser function.
 * - DeleteUserOutput: The output type for the deleteUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GoogleAuth } from 'google-auth-library';
import { firebaseConfig } from '@/firebase/config';

const DeleteUserInputSchema = z.object({
  uid: z.string().describe('The UID of the user to delete.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;

// Helper function to get a valid access token
async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase',
    ],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    throw new Error('Failed to retrieve access token.');
  }
  return accessToken.token;
}

export const deleteUser = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async (input) => {
    const { uid } = input;
    const projectId = firebaseConfig.projectId;
    if (!projectId) {
      throw new Error('Firebase project ID is not configured.');
    }

    try {
      const accessToken = await getAccessToken();

      // Step 1: Delete user from Firebase Authentication
      const deleteAuthUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`;
      const authResponse = await fetch(deleteAuthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          localId: uid,
        }),
      });

      // We don't throw if auth deletion fails with 400 (e.g., user not found),
      // as we still want to proceed with Firestore deletion.
      if (!authResponse.ok && authResponse.status !== 400) {
        const errorBody = await authResponse.json();
        console.error('Auth deletion failed:', errorBody);
        throw new Error(
          `Failed to delete user from authentication: ${
            errorBody.error?.message || 'Unknown error'
          }`
        );
      }

      // Step 2: Delete user profile from Firestore
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
      const firestoreResponse = await fetch(firestoreUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // If the user profile doesn't exist in Firestore (404), we still consider it a success.
      if (!firestoreResponse.ok && firestoreResponse.status !== 404) {
        const errorBody = await firestoreResponse.json();
        console.error('Firestore deletion failed:', errorBody);
        throw new Error(
          `Failed to delete user profile from Firestore: ${
            errorBody.error?.message || 'Unknown error'
          }`
        );
      }

      return {
        success: true,
        message: 'Usuario eliminado con éxito.',
      };
    } catch (error: any) {
      console.error('Full deletion flow error:', error);
      // Re-throw to make the flow fail and propagate the error to the client.
      throw new Error(error.message || 'An unexpected error occurred during user deletion.');
    }
  }
);
