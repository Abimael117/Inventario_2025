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
import { useRouter } from 'next/navigation';
import { useFirestore, useAuth, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { createNewUser, deleteExistingUser } from '@/lib/server-actions';


export default function SettingsClient() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();

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

  const handleAddUser = (newUser: Omit<User, 'id' | 'role' | 'uid'>) => {
    startTransition(async () => {
      const result = await createNewUser(newUser);
      if (result.success) {
        toast({
            title: "Usuario Creado",
            description: result.message,
        });
        setIsAddUserOpen(false);
      } else {
        toast({
            variant: "destructive",
            title: "Error al Crear Usuario",
            description: result.message,
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
    setUserToDelete(user);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!userToDelete) return;

    startTransition(async () => {
      const result = await deleteExistingUser({ uid: userToDelete.uid });
      if (result.success) {
        toast({
          title: "Usuario Eliminado",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error al Eliminar",
          description: result.message,
        });
      }
      
      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
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
    
    const allAdmins = users.filter(u => u.role === 'admin');
    const otherUsers = users.filter(u => u.role !== 'admin');
    
    const singleAdmin = allAdmins.length > 0 ? [allAdmins[0]] : [];
    
    const combinedUsers = [...singleAdmin, ...otherUsers];

    return combinedUsers.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') {
        return -1; // admin comes first
      }
      if (a.role !== 'admin' && b.role === 'admin') {
        return 1;
      }
      return a.name.localeCompare(b.name); // sort other users by name
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
                  Añade, edita o elimina perfiles de usuarios y gestiona sus permisos de acceso.
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
                      <li>El usuario **Administrador** tiene acceso a todas las secciones y no puede ser editado o eliminado.</li>
                      <li>La actualización de contraseñas no está disponible en esta pantalla por razones de seguridad.</li>
                      <li>La eliminación de un usuario desde esta interfaz lo borra **completamente** del sistema (acceso y perfil).</li>
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
                    Completa los detalles para crear una nueva cuenta de usuario.
                </DialogDescription>
            </DialogHeader>
            <AddUserForm onSubmit={handleAddUser} isPending={isPending} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Editar Usuario</DialogTitle>
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
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario "{userToDelete?.username}" de la autenticación y de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending ? 'Eliminando...' : 'Sí, eliminar usuario'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
