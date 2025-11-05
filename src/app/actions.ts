
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { createSafeActionClient } from 'next-safe-action';
import type { User } from '@/lib/types';

const action = createSafeActionClient();

// Define el esquema para un nuevo usuario
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  password: z.string(),
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.string()),
});

const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'users.json');

async function readUsers(): Promise<{ users: User[] }> {
  try {
    const data = await fs.readFile(usersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users.json:', error);
    // Si el archivo no existe o está vacío, devuelve una estructura válida
    return { users: [] };
  }
}

async function writeUsers(data: { users: User[] }): Promise<void> {
  await fs.writeFile(usersFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export const saveUser = action(userSchema, async (newUser) => {
  try {
    const data = await readUsers();
    
    const userExists = data.users.some(user => user.username === newUser.username);
    if (userExists) {
        return { success: false, error: 'El nombre de usuario ya existe.' };
    }

    data.users.push(newUser);
    await writeUsers(data);
    return { success: true, data: newUser };
  } catch (error: any) {
    console.error('Failed to save user:', error);
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
});


export const deleteUser = action(z.string(), async (userId) => {
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
});
