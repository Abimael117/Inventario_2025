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
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error(
        'GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set. Cannot initialize Firebase Admin SDK.'
      );
    }
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return {
    firestore: admin.firestore(),
    auth: admin.auth(),
  };
}
