
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { User, Product } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional(), // Contraseña opcional para edición
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.string()).min(1, { message: "Debes seleccionar al menos un permiso." }),
});

const productSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres."),
    category: z.string().min(2, "La categoría debe tener al menos 2 caracteres."),
    location: z.string().min(2, "La ubicación debe tener al menos 2 caracteres."),
    quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa."),
    reorderPoint: z.coerce.number().int().min(0, "El punto de reorden no puede ser negativo."),
});

const usersFilePath = path.join(process.cwd(), 'src', 'lib', 'users.json');
const productsFilePath = path.join(process.cwd(), 'src', 'lib', 'products.json');

// USER ACTIONS
async function readUsers(): Promise<{ users: User[] }> {
  try {
    const data = await fs.readFile(usersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { users: [] };
    console.error('Error reading users.json:', error);
    return { users: [] };
  }
}

async function writeUsers(data: { users: User[] }): Promise<void> {
  await fs.writeFile(usersFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function saveUser(newUser: Omit<User, 'id'>): Promise<{ success: boolean, error?: string, data?: User }> {
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
    const editSchema = userSchema.partial().extend({
      password: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
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
        
        const newPassword = result.data.password;
        const finalUserData = { 
            ...existingUser, 
            ...result.data,
            password: (newPassword && newPassword.length > 0) ? newPassword : existingUser.password
        };
        
        data.users[userIndex] = { ...finalUserData, id: userId, role: existingUser.role };

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


// PRODUCT ACTIONS
async function readProducts(): Promise<{ products: Product[] }> {
  try {
    const data = await fs.readFile(productsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { products: [] };
    console.error('Error reading products.json:', error);
    return { products: [] };
  }
}

async function writeProducts(data: { products: Product[] }): Promise<void> {
  await fs.writeFile(productsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function saveProduct(newProduct: Omit<Product, 'id'>): Promise<{ success: boolean, error?: string, data?: Product }> {
  const result = productSchema.safeParse(newProduct);

  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Datos de producto inválidos." };
  }
  
  try {
    const data = await readProducts();
    
    const skuExists = data.products.some(p => p.sku.toLowerCase() === result.data.sku.toLowerCase());
    if (skuExists) {
        return { success: false, error: 'El SKU ya existe para otro producto.' };
    }

    const productWithId = {
        ...result.data,
        id: (Date.now() + Math.random()).toString(36),
    };

    data.products.push(productWithId);
    await writeProducts(data);
    return { success: true, data: productWithId };
  } catch (error: any) {
    console.error('Failed to save product:', error);
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
}

export async function updateProduct(productId: string, updatedData: Partial<Omit<Product, 'id'>>): Promise<{ success: boolean; error?: string; data?: Product }> {
    const result = productSchema.partial().safeParse(updatedData);

    if (!result.success) {
        const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, error: firstError || "Datos de actualización inválidos." };
    }

    try {
        const data = await readProducts();
        const productIndex = data.products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return { success: false, error: 'No se encontró el producto a actualizar.' };
        }
        
        const existingProduct = data.products[productIndex];
        
        if (result.data.sku && result.data.sku !== existingProduct.sku) {
            const skuExists = data.products.some(p => p.sku.toLowerCase() === result.data.sku!.toLowerCase() && p.id !== productId);
            if (skuExists) {
                return { success: false, error: 'El SKU ya existe para otro producto.' };
            }
        }

        data.products[productIndex] = { ...existingProduct, ...result.data };

        await writeProducts(data);
        return { success: true, data: data.products[productIndex] };
    } catch (error: any) {
        console.error('Failed to update product:', error);
        return { success: false, error: error.message || 'An unknown error occurred while updating.' };
    }
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string; }> {
    try {
        const data = await readProducts();
        
        const initialCount = data.products.length;
        data.products = data.products.filter(p => p.id !== productId);

        if (data.products.length === initialCount) {
            return { success: false, error: 'No se encontró el producto a eliminar.' };
        }

        await writeProducts(data);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete product:', error);
        return { success: false, error: error.message || 'An unknown error occurred' };
    }
}
