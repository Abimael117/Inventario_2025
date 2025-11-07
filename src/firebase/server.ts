
'use server';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { experimental_taintObjectReference } from 'react';
import { headers } from 'next/headers';

// Este polyfill es necesario para el entorno de servidor de Node.js.
if (typeof atob === 'undefined') {
  global.atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
}

/**
 * Inicializa los SDK de Firebase en el servidor de forma segura.
 * Esta función se llama al inicio de cada Server Action.
 */
export async function getSdks() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  try {
    const sessionCookie = headers().get('x-session-cookie');
    
    if (sessionCookie) {
      const decodedCookie = JSON.parse(atob(sessionCookie));
      // Usamos el token del usuario para autenticarnos en el servidor en su nombre.
      await signInWithCustomToken(auth, decodedCookie.token);
    } else {
      // Permitir la ejecución sin autenticación para ciertas acciones (como el seeder).
      // Las reglas de seguridad de Firestore se encargarán de proteger los datos.
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
