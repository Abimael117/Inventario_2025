
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@/lib/types";

const permissions = [
  { id: 'dashboard', label: 'Ver Panel Principal' },
  { id: 'inventory', label: 'Gestionar Inventario' },
  { id: 'loans', label: 'Gestionar Préstamos' },
  { id: 'reports', label: 'Ver Reportes' },
] as const;

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres.").regex(/^[a-zA-Z0-9_]+$/, "Solo se permiten letras, números y guiones bajos (_)."),
  permissions: z.array(z.string()).refine(value => value.some(item => item), {
    message: "Debes seleccionar al menos un permiso.",
  }),
});

type EditUserFormProps = {
  user: User;
  onSubmit: (data: Partial<Omit<User, 'id' | 'role' | 'password'>>) => void;
  isPending: boolean;
};

export function EditUserForm({ user, onSubmit, isPending }: EditUserFormProps) {
  const isAdmin = user.role === 'admin';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || "",
      permissions: isAdmin ? permissions.map(p => p.id) : user.permissions || [],
    },
  });

  useEffect(() => {
    form.reset({
      name: user.name,
      username: user.username,
      permissions: isAdmin ? permissions.map(p => p.id) : user.permissions,
    });
  }, [user, form, isAdmin]);


  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const dataToSubmit: Partial<Omit<User, 'id' | 'role' | 'password'>> = {
      name: values.name,
      username: values.username,
    };
    
    if (!isAdmin) {
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
          name="permissions"
          render={() => (
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
                            disabled={isAdmin}
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
               {isAdmin && <FormDescription className="mt-2">El administrador siempre tiene todos los permisos.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
