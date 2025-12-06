'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ShieldQuestion, Loader2, Edit, PlusCircle } from 'lucide-react';
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
import { EditUserForm } from '@/components/users/edit-user-form';
import { AddUserForm } from '@/components/users/add-user-form';
import type { User } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';

interface SettingsClientProps {
  users: User[];
  isLoading: boolean;
  currentUser: FirebaseUser | null;
  userToEdit: User | null;
  userToDelete: User | null;
  isAddUserOpen: boolean;
  isEditUserOpen: boolean;
  isDeleteConfirmOpen: boolean;
  onSetIsAddUserOpen: (isOpen: boolean) => void;
  onSetIsEditUserOpen: (isOpen: boolean) => void;
  onSetIsDeleteConfirmOpen: (isOpen: boolean) => void;
  onAddUser: (newUserData: Omit<User, 'uid' | 'role'>) => void;
  onOpenEditDialog: (user: User) => void;
  onUpdateUser: (userId: string, data: Partial<Omit<User, 'id' | 'password'>>) => void;
  onOpenDeleteDialog: (user: User) => void;
  onConfirmDelete: () => void;
}

export default function SettingsClient({ 
    users, 
    isLoading,
    currentUser,
    userToEdit,
    userToDelete,
    isAddUserOpen,
    isEditUserOpen,
    isDeleteConfirmOpen,
    onSetIsAddUserOpen,
    onSetIsEditUserOpen,
    onSetIsDeleteConfirmOpen,
    onAddUser,
    onOpenEditDialog,
    onUpdateUser,
    onOpenDeleteDialog,
    onConfirmDelete
}: SettingsClientProps) {

  const permissionLabels: { [key: string]: string } = {
    dashboard: 'Panel',
    inventory: 'Inventario',
    loans: 'Préstamos',
    reports: 'Reportes',
    settings: 'Configuración'
  };

  return (
    <>
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>
                  Edita, elimina y crea nuevos usuarios para el sistema.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => onSetIsAddUserOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Usuario
              </Button>
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
                      {isLoading && users.length === 0 ? (
                          <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">
                                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                              </TableCell>
                          </TableRow>
                      ) : users.map(user => (
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
                                  onClick={() => onOpenEditDialog(user)}
                                  disabled={isLoading || user.role === 'admin'}
                                  aria-label="Editar usuario"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => onOpenDeleteDialog(user)}
                                  disabled={isLoading || user.uid === currentUser?.uid || user.role === 'admin'}
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
                    <li>La eliminación de un perfil desde esta interfaz solo borra sus datos de la aplicación. La cuenta de acceso debe ser borrada manualmente desde la Consola de Firebase si se desea eliminar el acceso por completo.</li>
                    <li>Las contraseñas de nuevos usuarios deben ser seguras y tener al menos 6 caracteres.</li>
                  </ul>
              </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isAddUserOpen} onOpenChange={onSetIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                <DialogDescription>
                    Completa los detalles para crear una nueva cuenta de usuario.
                </DialogDescription>
            </DialogHeader>
            <AddUserForm 
              onSubmit={onAddUser}
              isPending={isLoading}
            />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={onSetIsEditUserOpen}>
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
                    onSubmit={(data) => onUpdateUser(userToEdit.uid, data as any)}
                    isPending={isLoading} 
                />
              )}
          </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={onSetIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el perfil de "{userToDelete?.username}" de la base de datos de la aplicación. Su cuenta de acceso **no** será eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Eliminando...' : 'Sí, eliminar perfil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
