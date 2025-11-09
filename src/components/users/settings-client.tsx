
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
import { useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { updateUserAction } from '@/actions/users';


const DUMMY_DOMAIN = 'decd.local';

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
      try {
        if (!auth || !firestore) {
            throw new Error("Firebase services not available");
        }

        const email = `${newUser.username}@${DUMMY_DOMAIN}`;
        const { user: newAuthUser } = await createUserWithEmailAndPassword(auth, email, newUser.password!);
        
        const userDocData = {
          uid: newAuthUser.uid,
          name: newUser.name,
          username: newUser.username,
          role: 'user' as const,
          permissions: newUser.permissions,
        };

        const userDocRef = doc(firestore, "users", newAuthUser.uid);
        await setDoc(userDocRef, userDocData);

        toast({
          title: "Usuario Creado",
          description: `El usuario "${newUser.username}" ha sido creado con éxito.`,
        });

        setIsAddUserOpen(false);
        router.refresh();

      } catch (error: any) {
        let description = "No se pudo crear el usuario. Inténtalo de nuevo.";
        if (error instanceof FirebaseError) {
          if (error.code === 'auth/email-already-in-use') {
            description = 'Este nombre de usuario ya está en uso.';
          } else if (error.code === 'auth/weak-password') {
            description = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
          }
        }
        toast({
          variant: "destructive",
          title: "Error al Crear Usuario",
          description,
        });
      }
    });
  };

  const openEditDialog = (user: User) => {
    setUserToEdit(user);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = (userId: string, data: Omit<User, 'id' | 'password' | 'uid'>) => {
     startTransition(async () => {
        // Construct the payload explicitly to ensure all required fields are sent
        const payload = {
            name: data.name,
            username: data.username,
            role: data.role,
            permissions: data.permissions,
        };

        const result = await updateUserAction(userId, payload);
        if (result.success) {
           toast({
              title: "Usuario Actualizado",
              description: `Los datos del usuario han sido actualizados.`,
          });
          setIsEditUserOpen(false);
          // router.refresh(); This might not be needed if useCollection updates automatically
        } else {
            toast({
              variant: "destructive",
              title: "Error al Actualizar",
              description: result.error || "No se pudo actualizar el usuario.",
          });
        }
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
    if (userToDelete && firestore) {
      startTransition(async () => {
        try {
            const userDocRef = doc(firestore, "users", userToDelete.uid);
            await deleteDoc(userDocRef);
            // NOTE: Deleting the auth user requires admin privileges and is complex to do securely from the client.
            // For this app, we only delete the Firestore profile. The user won't be able to log in effectively.
            toast({
                title: "Usuario Eliminado",
                description: `El perfil del usuario "${userToDelete.username}" ha sido eliminado.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al Eliminar",
                description: "No se pudo eliminar el perfil del usuario."
            });
        } finally {
            setIsDeleteConfirmOpen(false);
            setUserToDelete(null);
        }
      });
    }
  }

  const permissionLabels: { [key: string]: string } = {
    dashboard: 'Panel',
    inventory: 'Inventario',
    loans: 'Préstamos',
    reports: 'Reportes',
    settings: 'Configuración'
  };

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
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
                  Añade, edita o elimina usuarios y gestiona sus permisos de acceso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Permisos</TableHead>
                            <TableHead className='text-right'>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedUsers.map(user => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>
                                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.role === 'admin' ? 'Admin' : 'Usuario'}
                                  </Badge>
                                </TableCell>
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
                                    disabled={isPending}
                                    aria-label="Editar usuario"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => openDeleteDialog(user)}
                                    disabled={user.username === 'admin' || isPending}
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
                      <li>La actualización de contraseñas no está disponible en esta pantalla por razones de seguridad. Debe hacerse desde la <strong>Consola de Firebase</strong>.</li>
                       <li>La eliminación de usuarios solo borra su perfil de la base de datos (Firestore). Para una eliminación completa, se debe hacer desde la <strong>Consola de Firebase</strong>.</li>
                    </ul>
                </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
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
          <DialogContent>
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
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el registro del usuario de la base de datos, pero no del sistema de autenticación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
