
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useCollection, useFirestore, useAuth, useUser } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/header';
import SettingsClient from '@/components/users/settings-client';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError, errorEmitter } from '@/firebase';
import { FirebaseError } from 'firebase/app';


export default function SettingsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const usersCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: rawUsers, isLoading: isLoadingUsers } = useCollection<User>(usersCollectionRef);

  // Deduplicate and sort users
  const users = useMemo(() => {
    if (!rawUsers) return [];
    const uniqueUsersMap = new Map<string, User>();
    for (const user of rawUsers) {
      if (user && user.uid) {
        uniqueUsersMap.set(user.uid, user);
      }
    }
    return Array.from(uniqueUsersMap.values()).sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [rawUsers]);

  const handleAddUser = (newUserData: Omit<User, 'uid' | 'role'>) => {
    startTransition(async () => {
      if (!auth || !firestore) {
        toast({
            variant: "destructive",
            title: "Error de Servicio",
            description: "Los servicios de Firebase no están disponibles.",
        });
        return;
      }
      
      const email = `${newUserData.username}@decd.local`;

      try {
        // Step 1: Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, newUserData.password!);
        const newAuthUser = userCredential.user;

        // Step 2: Create user profile in Firestore
        const { password, ...userDataForFirestore } = newUserData;
        const userDocRef = doc(firestore, 'users', newAuthUser.uid);
        
        await setDoc(userDocRef, {
          ...userDataForFirestore,
          uid: newAuthUser.uid,
          role: 'user', // Default role
          permissions: newUserData.permissions || [],
        });

        toast({
          title: "Usuario Creado",
          description: `El usuario "${newUserData.username}" ha sido creado y ya puede iniciar sesión.`,
        });
        setIsAddUserOpen(false);

      } catch (error) {
        if (error instanceof FirebaseError) {
           let errorMessage = 'Ocurrió un error desconocido al crear el usuario.';
           switch (error.code) {
             case 'auth/email-already-in-use':
               errorMessage = 'Este nombre de usuario ya está en uso. Elige otro.';
               break;
             case 'auth/weak-password':
               errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
               break;
              case 'auth/invalid-email':
                errorMessage = 'El nombre de usuario no tiene un formato válido.';
                break;
             default: // Includes 'permission-denied' for Firestore write
                const permissionError = new FirestorePermissionError({
                     path: `users/${newUserData.username}`,
                     operation: 'create',
                     requestResourceData: newUserData,
                 });
                 errorEmitter.emit('permission-error', permissionError);
                 return;
           }
            toast({
                variant: "destructive",
                title: "Error al Crear Usuario",
                description: errorMessage,
            });
        } else {
            // Generic error
            const permissionError = new FirestorePermissionError({
                path: `users/${newUserData.username}`,
                operation: 'create',
                requestResourceData: newUserData,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
      }
    });
  };

  const openEditDialog = (user: User) => {
    setUserToEdit(user);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = (userId: string, data: Partial<Omit<User, 'id' | 'password'>>) => {
     startTransition(async () => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);

        const updatePayload = {
            name: data.name,
            permissions: data.permissions,
        };

        setDoc(userDocRef, updatePayload, { merge: true })
            .then(() => {
                toast({
                    title: "Usuario Actualizado",
                    description: `Los datos del usuario han sido guardados.`,
                });
                setIsEditUserOpen(false);
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updatePayload,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    });
  };

  const openDeleteDialog = (user: User) => {
    if (user.uid === currentUser?.uid) {
      toast({
        variant: "destructive",
        title: "Acción no permitida",
        description: "No puedes eliminar tu propia cuenta.",
      });
      return;
    }
     if (user.role === 'admin') {
      toast({
        variant: "destructive",
        title: "Acción no permitida",
        description: "La cuenta de administrador no puede ser eliminada.",
      });
      return;
    }
    setUserToDelete(user);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!userToDelete || !firestore) return;

    startTransition(async () => {
        const userDocRef = doc(firestore, 'users', userToDelete.uid);
        deleteDoc(userDocRef)
            .then(() => {
                 toast({
                    title: "Perfil de Usuario Eliminado",
                    description: `El perfil de "${userToDelete.username}" ha sido eliminado. La cuenta de acceso debe ser borrada manually desde la Consola de Firebase.`,
                });
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsDeleteConfirmOpen(false);
                setUserToDelete(null);
            });
    });
  };

  return (
    <>
        <AppHeader title="Configuración" />
        {isLoadingUsers && !users.length ? (
            <main className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando usuarios...</p>
            </div>
            </main>
        ) : (
            <SettingsClient 
                users={users} 
                isLoading={isLoadingUsers || isPending}
                currentUser={currentUser}
                userToEdit={userToEdit}
                userToDelete={userToDelete}
                isAddUserOpen={isAddUserOpen}
                isEditUserOpen={isEditUserOpen}
                isDeleteConfirmOpen={isDeleteConfirmOpen}
                onSetIsAddUserOpen={setIsAddUserOpen}
                onSetIsEditUserOpen={setIsEditUserOpen}
                onSetIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
                onAddUser={handleAddUser}
                onOpenEditDialog={openEditDialog}
                onUpdateUser={handleUpdateUser}
                onOpenDeleteDialog={openDeleteDialog}
                onConfirmDelete={confirmDelete}
            />
        )}
    </>
  );
}
