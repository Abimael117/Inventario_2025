
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
import { useFirestore, useAuth, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser as deleteFirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

type SettingsClientProps = {
  initialUsers: User[];
};

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

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    startTransition(async () => {
      try {
        // We can't create a user with the client SDK and then sign out and sign back in
        // as the original user. We'll show an alert that this isn't supported in Studio.
        toast({
          variant: "destructive",
          title: "Función no compatible",
          description: "La creación de usuarios no es compatible en este entorno. Usa la consola de Firebase.",
        });

      } catch (error: any) {
        let description = "No se pudo crear el usuario. Inténtalo de nuevo.";
        if (error instanceof FirebaseError) {
          if (error.code === 'auth/email-already-in-use') {
            description = 'Este correo electrónico ya está en uso por otra cuenta.';
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
    if (user.role === 'admin') {
        toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: "No se puede editar al usuario administrador principal.",
        });
        return;
    }
    setUserToEdit(user);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = (userId: string, data: Partial<Omit<User, 'id' | 'role'>>) => {
    startTransition(async () => {
      try {
        const userDocRef = doc(firestore, "users", userId);
        // We only support updating permissions for now.
        setDocumentNonBlocking(userDocRef, { permissions: data.permissions }, { merge: true });
        
        toast({
            title: "Usuario Actualizado",
            description: `Los permisos del usuario han sido actualizados.`,
        });
        setIsEditUserOpen(false);
        router.refresh();
      } catch (e) {
         toast({
            variant: "destructive",
            title: "Error al Actualizar",
            description: "No se pudo actualizar el usuario.",
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
    if (userToDelete) {
      startTransition(async () => {
        try {
          // Deleting users from the client is a sensitive operation and not recommended
          // without re-authentication, which complicates the UX in this admin panel.
          // We will delete the Firestore document but leave the auth user for now.
          const userDocRef = doc(firestore, "users", userToDelete.id);
          deleteDocumentNonBlocking(userDocRef);

          toast({
            title: "Usuario Eliminado",
            description: `El registro del usuario "${userToDelete.username}" ha sido eliminado de la base de datos. La cuenta de autenticación no fue eliminada.`,
          });
          router.refresh();
        } catch (e: any) {
          toast({
            variant: "destructive",
            title: "Error al Eliminar",
            description: "No se pudo eliminar el registro del usuario. La cuenta de autenticación puede requerir una nueva autenticación.",
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
    settings: 'Configuración'
  };

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
                  Añade, edita o elimina usuarios y gestiona sus permisos de acceso. Los datos se gestionan en Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Permisos</TableHead>
                            <TableHead className='text-right'>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialUsers.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>
                                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.role === 'admin' ? 'Admin' : 'Usuario'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="flex flex-wrap gap-1">
                                  {user.role === 'admin' ? (
                                    <Badge>Todos</Badge>
                                  ) : user.permissions && user.permissions.length > 0 ? (
                                    user.permissions.map(p => <Badge key={p} variant="outline">{permissionLabels[p] || p}</Badge>)
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Ninguno</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => openEditDialog(user)}
                                    disabled={user.role === 'admin' || isPending}
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
                      <li>La creación de nuevos usuarios está deshabilitada en este entorno para mantener la seguridad de la sesión del administrador actual. Puedes añadir nuevos usuarios directamente desde la consola de Firebase Authentication.</li>
                      <li>La edición de usuarios se limita a cambiar sus permisos. Cambiar correos o contraseñas requiere una nueva autenticación que no está implementada en este panel.</li>
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
                      Modifica los permisos de acceso del usuario.
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
