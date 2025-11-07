
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// This is a simplified, less secure way to load credentials for environments
// like Firebase Gen 2 functions where GOOGLE_APPLICATION_CREDENTIALS might not be set.
// It directly uses the environment variables you set.
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = serviceAccountString && serviceAccountString.trim() !== ''
  ? JSON.parse(serviceAccountString)
  : undefined;

/**
 * Initializes the Firebase Admin App, ensuring it's only done once.
 * @returns The initialized Firebase Admin App instance.
 */
export function initFirebaseAdminApp(): App {
  // If the app named '[DEFAULT]' already exists, return it.
  if (getApps().length) {
    return getApps()[0];
  }
  
  // If service account JSON is available, use it. Otherwise, rely on ADC.
  const credential = serviceAccount ? cert(serviceAccount) : undefined;
  
  // Initialize the app. If credential is undefined, it will use Application Default Credentials.
  return initializeApp({
    credential
  });
}
