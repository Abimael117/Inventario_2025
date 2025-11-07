
'use server';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { experimental_taintObjectReference } from 'react';

// Este polyfill es necesario para el entorno de servidor de Node.js.
if (typeof atob === 'undefined') {
  global.atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
}

/**
 * Inicializa los SDK de Firebase en el servidor de forma segura.
 * Esta función se llama al inicio de cada Server Action.
 * Acepta un token de ID opcional para autenticar la solicitud.
 */
export async function getSdks(idToken?: string) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  try {
    if (idToken) {
      // Si se proporciona un token, inicia sesión en el servidor con él.
      await signInWithCustomToken(auth, idToken);
    } else {
        // Permitir la ejecución sin autenticación para ciertas acciones (como el seeder).
        // Las reglas de seguridad de Firestore se encargarán de proteger los datos si es necesario.
        console.warn('Server-side SDKs initialized without a user token.');
    }
  } catch (error) {
    console.error('Server-side auth error:', error);
    // Propaga el error para detener la ejecución de la acción.
    throw error;
  }
  
  // Marca los objetos para evitar que se envíen al cliente.
  experimental_taintObjectReference(
    'Do not pass server-side SDKs to the client!',
    auth
  );
   experimental_taintObjectReference(
    'Do not pass server-side SDKs to the client!',
    firestore
  );

  return {
      firebaseApp: app,
      auth: auth,
      firestore: firestore,
  };
}
