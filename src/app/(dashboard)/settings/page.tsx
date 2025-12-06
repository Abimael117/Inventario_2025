
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/header';
import SettingsClient from '@/components/users/settings-client';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError, errorEmitter } from '@/firebase';
import { createNewUser } from '@/app/actions/user-actions';

export default function SettingsPage() {
  const firestore = useFirestore();
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
      const result = await createNewUser(newUserData);
      if (result.success) {
        toast({
          title: "Usuario Creado",
          description: `El usuario "${newUserData.username}" ha sido creado con éxito.`,
        });
        setIsAddUserOpen(false);
      } else {
        // If server-side creation fails (e.g., no credentials), simulate client-side.
        if (result.error?.includes('SDK de Firebase Admin no está inicializado') && firestore) {
            const simulatedUid = `simulated_${Date.now()}`;
            const userDocRef = doc(firestore, 'users', simulatedUid);
            
            const { password, ...userDataForFirestore } = newUserData;

            const finalUserData = {
                ...userDataForFirestore,
                uid: simulatedUid,
                role: 'user' as 'user',
                permissions: newUserData.permissions || [],
            };

            await setDoc(userDocRef, finalUserData)
                .then(() => {
                    toast({
                        title: "Usuario Simulado Creado",
                        description: `El usuario "${newUserData.username}" se ha añadido localmente. No podrá iniciar sesión.`,
                    });
                    setIsAddUserOpen(false);
                })
                .catch(() => {
                    toast({
                      variant: "destructive",
                      title: "Error al Simular",
                      description: "No se pudo simular la creación del usuario en el cliente.",
                    });
                });
        } else {
             toast({
                variant: "destructive",
                title: "Error al Crear Usuario",
                description: result.error || 'Ocurrió un error desconocido.',
            });
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
            .catch(async () => {
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
            .catch(async () => {
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

    