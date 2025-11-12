
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { User } from "@/lib/types";

const permissions = [
  { id: 'dashboard', label: 'Ver Panel Principal' },
  { id: 'inventory', label: 'Gestionar Inventario' },
  { id: 'loans', label: 'Gestionar Préstamos' },
  { id: 'reports', label: 'Ver Reportes' },
] as const;

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  gender: z.enum(["male", "female", "other"]),
  permissions: z.array(z.string()),
});

type EditUserFormProps = {
  user: User;
  onSubmit: (data: Partial<Omit<User, 'id' | 'password'>>) => void;
  isPending: boolean;
};

export function EditUserForm({ user, onSubmit, isPending }: EditUserFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || "",
      permissions: user.permissions || [],
      gender: user.gender || "other",
    },
  });

  useEffect(() => {
    form.reset({
      name: user.name,
      permissions: user.permissions,
      gender: user.gender || "other",
    });
  }, [user, form]);
  
  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const dataToSubmit: Partial<Omit<User, 'id' | 'password' | 'uid'>> = {
      name: values.name,
      permissions: values.permissions, 
      gender: values.gender,
    };
    
    onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
        <FormItem>
            <FormLabel>Nombre de Usuario</FormLabel>
            <FormControl>
                <Input value={user.username || ''} disabled />
            </FormControl>
            <FormDescription>El nombre de usuario no se puede cambiar.</FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Género del Avatar</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-row space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="male" />
                    </FormControl>
                    <FormLabel className="font-normal">Masculino</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="female" />
                    </FormControl>
                    <FormLabel className="font-normal">Femenino</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="other" />
                    </FormControl>
                    <FormLabel className="font-normal">No especificar</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
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
                            ? field.onChange([...(field.value || []), item.id])
                            : field.onChange(
                                (field.value || []).filter(
                                  (value) => value !== item.id
                                )
                              );
                        }}
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
        
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
