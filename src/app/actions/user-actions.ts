'use server';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';

// Use environment variables for service account credentials
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initializes and returns Firebase SDK instances for server-side actions.
// Ensures that Firebase is initialized only once.
function getFirebaseAdmin() {
  const appName = 'firebase-admin-app-for-actions';
  // Check if the app is already initialized
  const existingApp = getApps().find(app => app.name === appName);
  if (existingApp) {
    return {
      auth: getAuth(existingApp),
      firestore: getFirestore(existingApp)
    };
  }
  
  // If not initialized, create a new app instance
  const app = initializeApp(firebaseConfig, appName);
  return {
      auth: getAuth(app),
      firestore: getFirestore(app)
  };
}


const DUMMY_DOMAIN = 'decd.local';

/**
 * Creates a new user in Firebase Authentication and Firestore.
 * This is a server action and should only be called from the server.
 * @param userData - The user data for the new user.
 * @returns An object with success status and a message or error.
 */
export async function createNewUser(
  userData: Omit<User, 'uid' | 'role'>
): Promise<{ success: boolean; message?: string; error?: string }> {
  
  try {
    const { auth, firestore } = getFirebaseAdmin();

    if (!userData.password || userData.password.length < 6) {
      return { success: false, error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
    }

    const email = `${userData.username}@${DUMMY_DOMAIN}`;

    // 1. Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, userData.password);
    const userRecord = userCredential.user;

    // 2. Create user profile in Firestore
    // Do NOT store the password in Firestore.
    const { password, ...userDataForFirestore } = userData;

    const userDocRef = doc(firestore, 'users', userRecord.uid);
    await setDoc(userDocRef, {
      ...userDataForFirestore,
      uid: userRecord.uid,
      role: 'user', // Default role
      permissions: userData.permissions || [], // Use permissions from form
    });

    return { success: true, message: 'Usuario creado con éxito.' };

  } catch (error: any) {
    console.error('Error creating new user:', error);
    let errorMessage = 'Error desconocido al crear el usuario.';
    
    // Provide more specific error messages based on Firebase error codes
    if (error.code) {
        switch (error.code) {
        case 'auth/email-already-in-use':
            errorMessage = 'Este nombre de usuario ya está en uso.';
            break;
        case 'auth/invalid-password':
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            break;
        case 'auth/invalid-email':
            errorMessage = 'El formato del nombre de usuario no es válido.';
            break;
        case 'app/no-app':
             errorMessage = 'Error de configuración de Firebase en el servidor. Asegúrate de que las variables de entorno están bien configuradas en Vercel.';
             break;
        }
    } else if (error.message && error.message.includes('Firebase ID token has invalid')) {
        errorMessage = 'Error de configuración del servidor. Contacta al administrador.';
    }
    
    return { success: false, error: errorMessage };
  }
}
