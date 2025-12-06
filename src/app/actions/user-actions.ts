
'use server';

// This file is kept for potential future use with server-side admin actions,
// but it is not currently used for user creation to allow for a functional
// development environment without requiring preset admin credentials.
// The user creation logic has been moved to the client-side in 'src/app/(dashboard)/settings/page.tsx'.

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '@/lib/types';
import { firebaseConfig } from '@/firebase/config';

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (!privateKey || !clientEmail) {
        console.warn(
          "Firebase Admin SDK credentials are not set in environment variables. " +
          "Server-side admin actions will be unavailable."
        );
        return null;
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
            projectId: firebaseConfig.projectId,
            clientEmail: clientEmail,
            privateKey: privateKey
        }),
      });
    } catch (e) {
      console.error("Failed to initialize Firebase Admin SDK:", e);
      return null;
    }
  }
  return admin.app();
}

const adminApp = initializeFirebaseAdmin();

export async function createNewUser(
  userData: Omit<User, 'uid' | 'role'>
): Promise<{ success: boolean; message?: string; error?: string }> {
  
  if (!adminApp) {
      return { 
          success: false, 
          error: "El SDK de Firebase Admin no está inicializado. No se pueden crear usuarios desde el servidor. Revisa las credenciales del entorno." 
      };
  }

  try {
    if (!userData.password || userData.password.length < 6) {
      return { success: false, error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
    }

    const email = `${userData.username}@decd.local`;

    const userRecord = await admin.auth().createUser({
      email: email,
      password: userData.password,
      displayName: userData.name,
    });

    const firestore = getFirestore();
    const { password, ...userDataForFirestore } = userData;

    const userDocRef = firestore.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      ...userDataForFirestore,
      uid: userRecord.uid,
      role: 'user', 
      permissions: userData.permissions || [],
    });

    return { success: true, message: 'Usuario creado con éxito.' };

  } catch (error: any) {
    console.error('Error creating new user with Admin SDK:', error);
    let errorMessage = 'Error desconocido al crear el usuario.';
    
    if (error.code) {
        switch (error.code) {
        case 'auth/email-already-exists':
            errorMessage = 'Este nombre de usuario ya está en uso.';
            break;
        case 'auth/invalid-password':
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            break;
        case 'auth/invalid-email':
            errorMessage = 'El formato del nombre de usuario no es válido.';
            break;
        }
    }
    
    return { success: false, error: errorMessage };
  }
}
