
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { User } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional(), // Contraseña opcional para edición
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.string()).min(1, { message: "Debes seleccionar al menos un permiso." }),
});

const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'users.json');

async function readUsers(): Promise<{ users: User[] }> {
  try {
    const data = await fs.readFile(usersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users.json:', error);
    return { users: [] };
  }
}

async function writeUsers(data: { users: User[] }): Promise<void> {
  await fs.writeFile(usersFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function saveUser(newUser: Omit<User, 'id'>): Promise<{ success: boolean, error?: string, data?: User }> {
  // Al crear, la contraseña es obligatoria
  const createSchema = userSchema.extend({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  });
  
  const result = createSchema.safeParse(newUser);

  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Datos de usuario inválidos." };
  }
  
  try {
    const data = await readUsers();
    
    const userExists = data.users.some(user => user.username.toLowerCase() === result.data.username.toLowerCase());
    if (userExists) {
        return { success: false, error: 'El nombre de usuario ya existe.' };
    }

    const userWithId = {
        ...result.data,
        id: (Date.now() + Math.random()).toString(36),
    };

    data.users.push(userWithId);
    await writeUsers(data);
    return { success: true, data: userWithId };
  } catch (error: any) {
    console.error('Failed to save user:', error);
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
}

export async function updateUser(userId: string, updatedData: Partial<Omit<User, 'id' | 'role'>>): Promise<{ success: boolean; error?: string; data?: User }> {
    // Al editar, los campos son opcionales
    const editSchema = userSchema.partial().extend({
      password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
    });
    const result = editSchema.safeParse(updatedData);

    if (!result.success) {
        const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, error: firstError || "Datos de actualización inválidos." };
    }

    try {
        const data = await readUsers();
        const userIndex = data.users.findIndex(user => user.id === userId);

        if (userIndex === -1) {
            return { success: false, error: 'No se encontró el usuario a actualizar.' };
        }

        const existingUser = data.users[userIndex];
        
        // Evitar que un admin se edite a sí mismo para quitarse el rol o permisos
        if (existingUser.role === 'admin') {
           // Opcional: podrías permitir cambiar nombre o contraseña, pero no permisos/rol.
        }

        // Merge de los datos, excluyendo la contraseña si no se proporcionó una nueva.
        const newPassword = result.data.password;
        const finalUserData = { 
            ...existingUser, 
            ...result.data,
            // Solo actualiza la contraseña si se proporcionó una nueva y no está vacía
            password: (newPassword && newPassword.length > 0) ? newPassword : existingUser.password
        };
        // @ts-ignore
        delete finalUserData.id; // Nos aseguramos de no cambiar el id
        
        data.users[userIndex] = { ...finalUserData, id: userId };

        await writeUsers(data);
        return { success: true, data: data.users[userIndex] };
    } catch (error: any) {
        console.error('Failed to update user:', error);
        return { success: false, error: error.message || 'An unknown error occurred while updating.' };
    }
}


export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string; data?: { userId: string } }> {
    try {
        const data = await readUsers();
        
        const initialUserCount = data.users.length;
        data.users = data.users.filter(user => user.id !== userId);

        if (data.users.length === initialUserCount) {
            return { success: false, error: 'No se encontró el usuario a eliminar.' };
        }

        await writeUsers(data);
        return { success: true, data: { userId } };
    } catch (error: any) {
        console.error('Failed to delete user:', error);
        return { success: false, error: error.message || 'An unknown error occurred' };
    }
}
