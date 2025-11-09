
import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin App, ensuring it's only done once.
 * This version uses Application Default Credentials (ADC),
 * which is automatically handled in managed Google Cloud environments like App Hosting.
 * @returns The initialized Firebase Admin App instance.
 */
export function initFirebaseAdminApp(): App {
  // If the app named '[DEFAULT]' already exists, return it to prevent re-initialization.
  if (getApps().length) {
    return getApps()[0];
  }
  
  // Initialize the app using applicationDefault(), which is the robust
  // way to use ADC in a managed environment.
  return initializeApp({
    credential: applicationDefault(),
  });
}
