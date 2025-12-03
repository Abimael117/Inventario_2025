
'use client';

import AppHeader from '@/components/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ShieldQuestion, Loader2, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddUserForm } from '@/components/users/add-user-form';
import { EditUserForm } from '@/components/users/edit-user-form';
import { useState, useTransition, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter, useUser } from '@/firebase';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { createNewUser } from '@/ai/flows/create-user-flow';

export default function SettingsClient() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  const usersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersRef);
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAddUser = (newUser: Omit<User, 'id' | 'role' | 'uid' | 'password'> & {password: string}) => {
    startTransition(async () => {
        try {
            const result = await createNewUser(newUser);
            if (result.success) {
                toast({
                    title: "Usuario Creado",
                    description: `El usuario "${newUser.username}" ha sido creado y puede iniciar sesión.`,
                });
                setIsAddUserOpen(false);
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido durante la creación.');
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al Crear Usuario",
                description: error.message || 'No se pudo crear la cuenta de usuario. Revisa los logs para más detalles.',
            });
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
            .catch(async (serverError) => {
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
    if (user.role === 'admin') {
      toast({
        variant: "destructive",
        title: "Acción no permitida",
        description: "No se puede eliminar al usuario administrador.",
      });
      return;
    }
    if (user.uid === currentUser?.uid) {
      toast({
        variant: "destructive",
        title: "Acción no permitida",
        description: "No puedes eliminar tu propia cuenta.",
      });
      return;
    }
    setUserToDelete(user);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!userToDelete || !firestore) return;

    startTransition(async () => {
        // Here, we should be calling a flow/action to delete the Auth user as well.
        // For now, we only delete the Firestore profile.
        const userDocRef = doc(firestore, 'users', userToDelete.uid);
        deleteDoc(userDocRef)
            .then(() => {
                 toast({
                    title: "Perfil de Usuario Eliminado",
                    description: `El perfil de "${userToDelete.username}" ha sido eliminado. La cuenta de acceso debe ser borrada manualmente desde la Consola de Firebase.`,
                });
            })
            .catch(error => {
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

  const permissionLabels: { [key: string]: string } = {
    dashboard: 'Panel',
    inventory: 'Inventario',
    loans: 'Préstamos',
    reports: 'Reportes',
    settings: 'Configuración'
  };
  
  const displayedUsers = useMemo(() => {
    if (!users) return [];
    
    const uniqueUsers = new Map<string, User>();
    users.forEach(u => {
        const userWithUid = { ...u, uid: u.id };
        if (!uniqueUsers.has(userWithUid.uid)) {
            uniqueUsers.set(userWithUid.uid, userWithUid);
        }
    });

    return Array.from(uniqueUsers.values()).sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [users]);


  if (isLoadingUsers) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Configuración" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando usuarios...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <AppHeader title="Configuración">
            <Button size="sm" onClick={() => setIsAddUserOpen(true)} disabled={isPending}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Añadir Usuario
            </Button>
        </AppHeader>
        <main className="flex-1 p-4 md:p-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>
                  Añade, edita o elimina usuarios y gestiona sus permisos de acceso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Permisos</TableHead>
                            <TableHead className='text-right'>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedUsers.map(user => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>
                                  <div className="flex flex-row gap-1 flex-wrap">
                                    {user.role === 'admin' ? (
                                      <Badge>Todos</Badge>
                                    ) : user.permissions && user.permissions.length > 0 ? (
                                      user.permissions.map(p => <Badge key={p} variant="outline">{permissionLabels[p] || p}</Badge>)
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Ninguno</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => openEditDialog(user)}
                                    disabled={isPending || user.role === 'admin'}
                                    aria-label="Editar usuario"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => openDeleteDialog(user)}
                                    disabled={user.role === 'admin' || isPending}
                                    aria-label="Eliminar usuario"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldQuestion className="h-5 w-5" />
                        Sobre la Gestión de Usuarios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                      <li>El perfil **Administrador** tiene acceso a todas las secciones y no puede ser editado o eliminado.</li>
                      <li>Al crear un nuevo usuario, se crea tanto su **cuenta de acceso** (autenticación) como su **perfil de permisos** (base de datos).</li>
                      <li>La eliminación de un perfil desde esta interfaz solo borra sus datos de la aplicación. La cuenta de acceso debe ser eliminada manualmente desde la Consola de Firebase.</li>
                    </ul>
                </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                <DialogDescription>
                    Completa los detalles para crear una nueva cuenta de usuario. Podrá iniciar sesión inmediatamente.
                </DialogDescription>
            </DialogHeader>
            <AddUserForm onSubmit={handleAddUser} isPending={isPending} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Editar Perfil</DialogTitle>
                  <DialogDescription>
                      Modifica los detalles del perfil del usuario.
                  </DialogDescription>
              </DialogHeader>
              {userToEdit && (
                <EditUserForm 
                    user={userToEdit} 
                    onSubmit={(data) => handleUpdateUser(userToEdit.uid, data as any)}
                    isPending={isPending} 
                />
              )}
          </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el perfil de "{userToDelete?.username}" de la base de datos de la aplicación. Su cuenta de acceso **no** será eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending ? 'Eliminando...' : 'Sí, eliminar perfil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
