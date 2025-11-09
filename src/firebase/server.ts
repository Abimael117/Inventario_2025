
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// This function will now rely on Application Default Credentials (ADC)
// which is the standard and secure way in Google Cloud environments.
// It no longer needs to parse the FIREBASE_SERVICE_ACCOUNT environment variable.

/**
 * Initializes the Firebase Admin App, ensuring it's only done once.
 * This version is simplified to rely on Application Default Credentials (ADC),
 * which is automatically handled in environments like App Hosting or Cloud Functions.
 * @returns The initialized Firebase Admin App instance.
 */
export function initFirebaseAdminApp(): App {
  // If the app named '[DEFAULT]' already exists, return it to prevent re-initialization.
  if (getApps().length) {
    return getApps()[0];
  }
  
  // Initialize the app. In a managed environment like App Hosting,
  // 'initializeApp()' with no arguments will automatically use the
  // project's service account via ADC.
  return initializeApp();
}
