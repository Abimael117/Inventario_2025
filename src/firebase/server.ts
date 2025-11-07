
'use server';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { headers } from 'next/headers';
import { experimental_taintObjectReference } from 'react';

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
    const headersList = headers();
    // Lee la cabecera 'x-session-cookie' que nuestro middleware ha añadido.
    const sessionCookie = headersList.get('x-session-cookie');
    
    if (sessionCookie) {
      // Si la cabecera con la cookie existe, inicia sesión en el servidor con ella.
      // NOTA: En una app de producción real, se acuñaría un token personalizado.
      // Aquí, reutilizamos el token de sesión por simplicidad.
      await signInWithCustomToken(auth, sessionCookie);
      
    } else {
        // Si no hay cookie de sesión, es un fallo crítico.
        // Esto no debería ocurrir en una acción iniciada por un usuario logueado.
        throw new Error('Server-side auth error: No session cookie found.');
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
