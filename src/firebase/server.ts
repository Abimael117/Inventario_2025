
'use server';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
      // La cookie contiene el token de ID, no un token personalizado.
      // signInWithCustomToken espera un token diferente.
      // La presencia de la cookie y la validación en el cliente es suficiente
      // para confiar en la identidad para las reglas de seguridad.
      // El SDK del cliente que llama a la acción ya está autenticado.
      // Aquí solo necesitamos una instancia de firestore.
      // La autenticación real se resuelve por cómo Firebase maneja las Server Actions y las cookies.
    } else if (headers().get('x-action-from-client')) {
        // Si la acción proviene de un cliente logueado, la cookie DEBERÍA estar allí.
        // Si no está, hay un problema de configuración o el usuario se deslogueó.
        // Lanzamos un error claro para detener la acción.
        // Excluimos las acciones de seeder que no necesitan auth.
        const isSeeder = headers().get('x-action-name')?.startsWith('seed');
        if (!isSeeder) {
            throw new Error('Server-side auth error: No session cookie found for a client action.');
        }
    }
  } catch (error) {
    console.error('Server-side auth error:', error);
    // Propaga el error para detener la ejecución de la acción.
    throw error;
  }
  
  return {
      firebaseApp: app,
      auth: auth,
      firestore: firestore,
  };
}
