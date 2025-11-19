'use server';
/**
 * @fileOverview This file defines a Genkit flow for deleting a Firebase user.
 * This flow makes an authorized API request to the Identity Toolkit API,
 * which has the necessary permissions to delete users.
 */

import { ai } from '@/ai/genkit';
import { firebaseConfig } from '@/firebase/config';
import { z } from 'genkit';

const DeleteUserInputSchema = z.object({
  uid: z.string().describe('The UID of the user to delete.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;

export async function deleteUser(input: DeleteUserInput): Promise<DeleteUserOutput> {
  return deleteUserFlow(input);
}

/**
 * Retrieves an OAuth 2.0 access token from the Google Cloud metadata server.
 * This is a secure way to get a token in a Google Cloud environment.
 * @returns {Promise<string>} The access token.
 */
async function getAccessToken(): Promise<string> {
  const metadataServerURL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
  const response = await fetch(metadataServerURL, {
    headers: {
      'Metadata-Flavor': 'Google',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error fetching access token:', errorText);
    throw new Error(`Could not refresh access token: Request failed with status code ${response.status}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}


const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async ({ uid }) => {
    try {
      // 1. Authenticate as a service account to get an access token.
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error('Failed to obtain access token.');
      }

      // 2. Use the access token to call the Identity Toolkit API to delete the user.
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}/accounts:delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          localId: uid,
        }),
      });

      // 3. Handle the API response.
      if (!response.ok) {
        const errorBody = await response.json();
        console.error('Error from Identity Toolkit API:', errorBody);
        const errorMessage = errorBody.error?.message || 'Failed to delete user from authentication service.';
        throw new Error(errorMessage);
      }
      
      return {
        success: true,
        message: 'User deleted from authentication service successfully.',
      };
    } catch (error: any) {
      console.error('Error in deleteUserFlow:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred while deleting the user.',
      };
    }
  }
);
