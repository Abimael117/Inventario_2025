
'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { initFirebaseAdminApp } from '@/firebase/server';
import type { User } from '@/lib/types';

// Inicializa Firebase Admin SDK una sola vez cuando el módulo se carga
initFirebaseAdminApp();

/**
 * Garantiza que un usuario específico exista tanto en Firebase Auth como en Firestore,
 * creándolo solo si es necesario y asegurando que sus claims y perfil estén sincronizados.
 * Esta función es idempotente y segura para llamar varias veces.
 * @param userData Los datos completos del usuario a procesar.
 */
async function processUser(userData: any) {
    const auth = getAuth();
    const firestore = getFirestore();
    let userRecord: UserRecord;

    // 1. Obtener o crear usuario en Firebase Auth.
    try {
        userRecord = await auth.getUserByEmail(userData.email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({
                email: userData.email,
                password: userData.password,
                displayName: userData.displayName,
            });
        } else {
            // Volver a lanzar cualquier otro error inesperado de Auth.
            throw error;
        }
    }

    const uid = userRecord.uid;

    // 2. Establecer Custom Claims en Auth (esto es idempotente).
    await auth.setCustomUserClaims(uid, userData.customClaims);

    // 3. Comprobar si el perfil de usuario existe en Firestore.
    const userDocRef = firestore.collection('users').doc(uid);
    const docSnap = await userDocRef.get();

    // 4. Crear el perfil en Firestore SÓLO si no existe.
    if (!docSnap.exists) {
        const profileData = {
            ...userData.firestoreProfile,
            uid: uid, // Asegurarse de que el UID se almacena en el documento.
        };
        await userDocRef.set(profileData);
    }
}


/**
 * Acción de servidor para asegurar que los usuarios iniciales ('admin' y 'educacion')
 * existan en el sistema sin duplicados.
 */
export async function ensureInitialUsers() {
    try {
        const adminUserData = {
            email: 'admin@decd.local',
            password: 'password123',
            displayName: 'Administrador',
            customClaims: { role: 'admin' },
            firestoreProfile: {
                name: 'Administrador',
                username: 'admin',
                role: 'admin' as const,
                permissions: ['dashboard', 'inventory', 'loans', 'reports', 'settings'],
            },
        };

        const educacionUserData = {
            email: 'educacion@decd.local',
            password: '123456',
            displayName: 'Centro educativo',
            customClaims: { role: 'user' },
            firestoreProfile: {
                name: 'Centro educativo',
                username: 'educacion',
                role: 'user' as const,
                permissions: ['dashboard', 'inventory', 'loans'],
            },
        };
        
        // Procesar ambos usuarios de forma segura.
        await processUser(adminUserData);
        await processUser(educacionUserData);

        return { success: true };

    } catch (error: any) {
        console.error("Error al garantizar los usuarios iniciales:", error);
        return { error: 'No se pudieron configurar los usuarios iniciales en el servidor.' };
    }
}


/**
 * Actualiza los detalles y permisos de un usuario tanto en Firebase Auth como en Firestore.
 * @param uid El UID del usuario a actualizar.
 * @param data Los datos del usuario a actualizar (nombre, permisos, rol).
 * @returns Un objeto que indica éxito o un mensaje de error.
 */
export async function updateUserAction(uid: string, data: Partial<Omit<User, 'id' | 'uid' | 'password'>>) {
  try {
    const auth = getAuth();
    const firestore = getFirestore();
    const userDocRef = firestore.collection('users').doc(uid);

    const firestoreUpdatePayload: { [key: string]: any } = {};
    let customClaimsUpdatePayload: { [key: string]: any } = {};

    // Construir payload para Firestore y Auth a partir de los datos recibidos.
    if (data.name !== undefined) {
      firestoreUpdatePayload.name = data.name;
    }
    
    if (data.permissions !== undefined) {
      firestoreUpdatePayload.permissions = Array.isArray(data.permissions) ? data.permissions : [];
    }
    
    if (data.role !== undefined) {
       firestoreUpdatePayload.role = data.role;
       customClaimsUpdatePayload.role = data.role;
       
       // Si el rol cambia a 'admin', se le otorgan todos los permisos automáticamente.
       if (data.role === 'admin') {
         const allPermissions = ['dashboard', 'inventory', 'loans', 'reports', 'settings'];
         firestoreUpdatePayload.permissions = allPermissions;
       }
    }

    // --- Ejecutar actualizaciones ---

    // 1. Actualizar el documento de Firestore si hay cambios.
    if (Object.keys(firestoreUpdatePayload).length > 0) {
      await userDocRef.update(firestoreUpdatePayload);
    }
    
    // 2. Actualizar el nombre de visualización en Auth si se proporcionó.
    if (data.name !== undefined) {
      await auth.updateUser(uid, { displayName: data.name });
    }

    // 3. Actualizar los custom claims en Auth si el rol cambió.
    if (Object.keys(customClaimsUpdatePayload).length > 0) {
       const user = await auth.getUser(uid);
       const existingClaims = user.customClaims || {};
       await auth.setCustomUserClaims(uid, { ...existingClaims, ...customClaimsUpdatePayload });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar el usuario:", error);
    let message = 'No se pudo actualizar el usuario.';
    if (error.code === 'auth/user-not-found') {
      message = 'El usuario no fue encontrado en el sistema de autenticación.';
    } else if (error.message) {
      message = error.message;
    }
    return { error: message };
  }
}
