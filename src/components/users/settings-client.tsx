
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
import { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useFirestore, useAuth, deleteDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

type SettingsClientProps = {
  initialUsers: User[];
};

const DUMMY_DOMAIN = 'stockwise.local';

export default function SettingsClient({ initialUsers }: SettingsClientProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  
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

  const handleUpdateUser = (userId: string, data: Partial<Omit<User, 'id' | 'role' | 'uid'>>) => {
     if (!firestore) return;
    startTransition(async () => {
        const userDocRef = doc(firestore, "users", userId);
        
        const dataToUpdate: Partial<User> = {};
        if (data.name) dataToUpdate.name = data.name;
        // Solo actualiza permisos si no es admin
        if (userToEdit?.role !== 'admin' && data.permissions) {
            dataToUpdate.permissions = data.permissions;
        }

        if(Object.keys(dataToUpdate).length === 0) {
            setIsEditUserOpen(false);
            return;
        }

        await setDoc(userDocRef, dataToUpdate, { merge: true });
        
        toast({
            title: "Usuario Actualizado",
            description: `Los datos del usuario han sido actualizados.`,
        });
        setIsEditUserOpen(false);
        router.refresh();
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
      startTransition(() => {
          const userDocRef = doc(firestore, "users", userToDelete.id);
          deleteDocumentNonBlocking(userDocRef);

          toast({
            title: "Usuario Eliminado",
            description: `El registro del usuario "${userToDelete.username}" ha sido eliminado de la base de datos. La cuenta de autenticación no fue eliminada.`,
          });
          
          setIsDeleteConfirmOpen(false);
          setUserToDelete(null);
          router.refresh();
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

  const sortedUsers = [...initialUsers].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') {
      return -1; // admin comes first
    }
    if (a.role !== 'admin' && b.role === 'admin') {
      return 1;
    }
    return a.name.localeCompare(b.name); // sort other users by name
  });

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
                            <TableRow key={user.id}>
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
                      <li>La creación de nuevos usuarios utiliza directamente Firebase Authentication.</li>
                      <li>La edición de usuarios actualmente solo modifica sus permisos en Firestore. Cambiar correos o contraseñas requiere una nueva autenticación que no está implementada en este panel.</li>
                      <li>La eliminación de usuarios solo borra su registro de la base de datos de Firestore, pero no elimina al usuario del sistema de autenticación de Firebase por razones de seguridad.</li>
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
                      Modifica los detalles del usuario.
                  </DialogDescription>
              </DialogHeader>
              {userToEdit && (
                <EditUserForm 
                    user={userToEdit} 
                    onSubmit={(data) => handleUpdateUser(userToEdit.id, data)}
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
