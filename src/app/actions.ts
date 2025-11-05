'use server';

import { action } from '@/lib/safe-action';
import { createUserSchema } from '@/lib/schemas';
import { getFirebaseAdmin } from './firebase-admin';

export const createUser = action(createUserSchema, async (data) => {
  try {
    const { auth, firestore } = getFirebaseAdmin();

    // Step 1: Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
    });

    // Step 2: Create user profile in Firestore
    const userDocRef = firestore.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      name: data.name,
      email: data.email,
      role: data.role,
    });

    // We only return a subset of the data for security.
    // Never return the full userRecord or password.
    return {
      uid: userRecord.uid,
      name: data.name,
      email: data.email,
      role: data.role,
    };
  } catch (error: any) {
    let errorMessage = 'Ocurrió un error inesperado al crear el usuario.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Este correo electrónico ya está en uso por otra cuenta.';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
    }
    
    // With next-safe-action, we can return a serverError to the client
    // which can then be displayed in a toast.
    return { serverError: errorMessage };
  }
});
