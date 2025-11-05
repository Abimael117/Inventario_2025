import * as admin from 'firebase-admin';
import 'server-only';

// This is a server-only module that initializes the Firebase Admin SDK.
// It is intended to be used in Server Actions, Route Handlers, etc.

let app: admin.app.App;

/**
 * Initializes the Firebase Admin SDK if not already initialized, and returns
 * the Admin Firestore and Auth services.
 * @returns An object containing the admin Firestore and Auth instances.
 */
export function getFirebaseAdmin() {
  if (!app) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        // Fallback for environments where the variable isn't set (e.g., local dev without .env file)
        // This will use Application Default Credentials if available.
        app = admin.initializeApp();
    }
  }

  return {
    firestore: admin.firestore(),
    auth: admin.auth(),
  };
}
