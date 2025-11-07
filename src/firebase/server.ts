
'use server';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Inicializa los SDK de Firebase en el servidor de forma segura.
 * Cuando se ejecuta una acción del servidor, el SDK de Firebase se basa
 * en el estado de autenticación del cliente que la invocó.
 * Las reglas de seguridad de Firestore (`request.auth`) son la principal línea de defensa
 * para validar si el usuario autenticado tiene permiso para realizar la operación.
 */
export async function getSdks() {
    // Inicializa la app de Firebase (si aún no se ha hecho).
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    // Devuelve los SDK inicializados. La autenticación del usuario
    // se maneja de forma transparente por el SDK del cliente y se valida
    // en el backend mediante las reglas de seguridad de Firestore.
    return {
        firebaseApp: app,
        auth: auth,
        firestore: firestore,
    };
}
