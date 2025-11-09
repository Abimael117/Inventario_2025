
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@/lib/types";

const permissions = [
  { id: 'dashboard', label: 'Ver Panel Principal' },
  { id: 'inventory', label: 'Gestionar Inventario' },
  { id: 'loans', label: 'Gestionar Préstamos' },
  { id: 'reports', label: 'Ver Reportes' },
  { id: 'settings', label: 'Ver Configuración' },
] as const;

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres.").regex(/^[a-zA-Z0-9_]+$/, "Solo se permiten letras, números y guiones bajos (_)."),
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.string()).refine(value => value.some(item => item), {
    message: "Debes seleccionar al menos un permiso.",
  }),
});

type EditUserFormProps = {
  user: User;
  onSubmit: (data: Partial<Omit<User, 'id' | 'password'>>) => void;
  isPending: boolean;
};

export function EditUserForm({ user, onSubmit, isPending }: EditUserFormProps) {
  const isPrincipalAdmin = user.username === 'admin';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || "",
      role: user.role || 'user',
      permissions: user.permissions || [],
    },
  });

  const role = form.watch('role');

  useEffect(() => {
    form.reset({
      name: user.name,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    });
  }, [user, form]);
  
  useEffect(() => {
    if (role === 'admin') {
      form.setValue('permissions', permissions.map(p => p.id));
    }
  }, [role, form]);


  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const dataToSubmit: Partial<Omit<User, 'id' | 'password' | 'uid'>> = {
      name: values.name,
      username: values.username,
    };
    
    if (!isPrincipalAdmin) {
      dataToSubmit.role = values.role;
      dataToSubmit.permissions = values.permissions;
    }
    
    onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de Usuario</FormLabel>
              <FormControl>
                <Input placeholder="Ej: juan.perez" {...field} disabled />
              </FormControl>
              <FormDescription>El nombre de usuario no se puede cambiar.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPrincipalAdmin}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                </SelectContent>
              </Select>
              {isPrincipalAdmin && <FormDescription>El rol del administrador principal no se puede cambiar.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <div className="mb-4">
            <FormLabel className="text-base">Permisos de Acceso</FormLabel>
            <FormDescription>
              Selecciona a qué secciones puede acceder el usuario.
            </FormDescription>
          </div>
          {permissions.map((item) => (
            <FormField
              key={item.id}
              control={form.control}
              name="permissions"
              render={({ field }) => {
                return (
                  <FormItem
                    key={item.id}
                    className="flex flex-row items-start space-x-3 space-y-0"
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(item.id)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...field.value, item.id])
                            : field.onChange(
                                field.value?.filter(
                                  (value) => value !== item.id
                                )
                              );
                        }}
                        disabled={role === 'admin'}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {item.label}
                    </FormLabel>
                  </FormItem>
                );
              }}
            />
          ))}
          <FormMessage />
        </FormItem>
         {role === 'admin' && <FormDescription className="mt-2 text-xs">El administrador siempre tiene todos los permisos.</FormDescription>}
        
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
