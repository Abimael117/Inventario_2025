
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
import { PlusCircle, Trash2, ShieldQuestion } from 'lucide-react';
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
import { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import usersData from '@/lib/users.json';
import { saveUser, deleteUser } from '@/app/actions';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(usersData.users);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    startTransition(async () => {
      const userWithId = { ...newUser, id: (Math.random() * 10000).toString(36) };
      const result = await saveUser(userWithId);

      if (result.success) {
        setUsers(currentUsers => [...currentUsers, userWithId]);
        toast({
          title: "Usuario Creado",
          description: `El usuario "${userWithId.username}" ha sido guardado.`,
        });
        setIsAddUserOpen(false);
        router.refresh(); // Recarga los datos del servidor
      } else {
        toast({
          variant: "destructive",
          title: "Error al Guardar",
          description: result.error || "No se pudo guardar el usuario en el servidor.",
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
        const result = await deleteUser(userToDelete.id);
        if (result.success) {
          setUsers(currentUsers => currentUsers.filter(u => u.id !== userToDelete!.id));
          toast({
            title: "Usuario Eliminado",
            description: `El usuario "${userToDelete!.username}" ha sido eliminado.`,
          });
          router.refresh(); // Recarga los datos del servidor
        } else {
          toast({
            variant: "destructive",
            title: "Error al Eliminar",
            description: result.error || "No se pudo eliminar el usuario.",
          });
        }
        setIsDeleteConfirmOpen(false);
        setUserToDelete(null);
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
                  Añade o elimina usuarios y gestiona sus permisos de acceso. Los cambios son permanentes.
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
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
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
                                    onClick={() => openDeleteDialog(user)}
                                    disabled={user.role === 'admin' || isPending}
                                    aria-label="Eliminar usuario"
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
                        Sobre este Sistema de Permisos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                       Este sistema de gestión de usuarios ahora guarda los cambios de forma permanente.
                       Cualquier usuario que crees o elimines se reflejará en el archivo de configuración del servidor.
                       Ten en cuenta que esta es una implementación simplificada para este entorno de prototipado.
                    </p>
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
                    Completa los detalles para crear una nueva cuenta de usuario. Los cambios se guardarán permanentemente.
                </DialogDescription>
            </DialogHeader>
            <AddUserForm onSubmit={handleAddUser} isPending={isPending} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al usuario "{userToDelete?.name}". No podrás deshacer esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              {isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
