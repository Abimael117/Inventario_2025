

'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { Product, Loan, StockMovement } from '@/lib/types';

const productSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres."),
    category: z.string().min(2, "La categoría debe tener al menos 2 caracteres."),
    location: z.string().min(2, "La ubicación debe tener al menos 2 caracteres."),
    quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa."),
    reorderPoint: z.coerce.number().int().min(0, "El punto de reorden no puede ser negativo."),
});

const loanSchema = z.object({
    productId: z.string(),
    productName: z.string(),
    requester: z.string().min(2, "El solicitante debe tener al menos 2 caracteres."),
    loanDate: z.string().datetime(),
    quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
});

const stockAdjustmentSchema = z.object({
  quantity: z.coerce.number().int().gt(0, "La cantidad a descontar debe ser mayor que cero."),
  reason: z.string().min(3, "La razón debe tener al menos 3 caracteres."),
});


// JSON file paths are kept for reference but logic will be migrated to Firestore
const productsFilePath = path.join(process.cwd(), 'src', 'lib', 'products.json');
const loansFilePath = path.join(process.cwd(), 'src', 'lib', 'loans.json');
const movementsFilePath = path.join(process.cwd(), 'src', 'lib', 'movements.json');


// HELPERS
async function readData<T>(filePath: string, defaultData: T): Promise<T> {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultData;
        console.error(`Error reading ${filePath}:`, error);
        return defaultData;
    }
}

async function writeData<T>(filePath: string, data: T): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// PRODUCT ACTIONS
export async function saveProduct(newProduct: Omit<Product, 'id'>): Promise<{ success: boolean, error?: string, data?: Product }> {
  const result = productSchema.safeParse(newProduct);

  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Datos de producto inválidos." };
  }
  
  try {
    const data = await readData(productsFilePath, { products: [] });
    
    const skuExists = data.products.some(p => p.sku.toLowerCase() === result.data.sku.toLowerCase());
    if (skuExists) {
        return { success: false, error: 'El SKU ya existe para otro producto.' };
    }

    const productWithId = {
        ...result.data,
        id: (Date.now() + Math.random()).toString(36),
    };

    data.products.push(productWithId);
    await writeData(productsFilePath, data);
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
        const data = await readData(productsFilePath, { products: [] });
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

        await writeData(productsFilePath, data);
        return { success: true, data: data.products[productIndex] };
    } catch (error: any) {
        console.error('Failed to update product:', error);
        return { success: false, error: error.message || 'An unknown error occurred while updating.' };
    }
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string; }> {
    try {
        const data = await readData(productsFilePath, { products: [] });
        
        const initialCount = data.products.length;
        data.products = data.products.filter(p => p.id !== productId);

        if (data.products.length === initialCount) {
            return { success: false, error: 'No se encontró el producto a eliminar.' };
        }

        await writeData(productsFilePath, data);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete product:', error);
        return { success: false, error: error.message || 'An unknown error occurred' };
    }
}

// STOCK ADJUSTMENT ACTION
export async function adjustStock(productId: string, adjustmentData: { quantity: number; reason: string }): Promise<{ success: boolean; error?: string; }> {
  const result = stockAdjustmentSchema.safeParse(adjustmentData);

  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Datos de ajuste inválidos." };
  }

  try {
    const productsData = await readData(productsFilePath, { products: [] });
    const productIndex = productsData.products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
      return { success: false, error: "No se encontró el producto." };
    }

    const product = productsData.products[productIndex];
    if (result.data.quantity > product.quantity) {
      return { success: false, error: `Stock insuficiente. Solo hay ${product.quantity} unidades.` };
    }

    // Update product quantity
    product.quantity -= result.data.quantity;
    await writeData(productsFilePath, productsData);

    // Record the movement
    const movementsData = await readData(movementsFilePath, { movements: [] });
    const newMovement: StockMovement = {
      id: (Date.now() + Math.random()).toString(36),
      productId: product.id,
      productName: product.name,
      quantity: result.data.quantity,
      type: 'descuento',
      reason: result.data.reason,
      date: new Date().toISOString(),
    };
    movementsData.movements.push(newMovement);
    await writeData(movementsFilePath, movementsData);

    return { success: true };
  } catch (e: any) {
    console.error("Failed to adjust stock:", e);
    return { success: false, error: e.message || "Ocurrió un error desconocido." };
  }
}


// LOAN ACTIONS
export async function saveLoan(loanData: Omit<Loan, 'id' | 'status'>): Promise<{ success: boolean, error?: string, data?: Loan }> {
    const result = loanSchema.safeParse(loanData);
    if (!result.success) {
        const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, error: firstError || "Datos de préstamo inválidos." };
    }
    
    try {
        const loansData = await readData(loansFilePath, { loans: [] });
        const productsData = await readData(productsFilePath, { products: [] });

        const productIndex = productsData.products.findIndex(p => p.id === result.data.productId);
        if (productIndex === -1) {
            return { success: false, error: "El producto seleccionado ya no existe." };
        }
        
        const product = productsData.products[productIndex];
        if (product.quantity < result.data.quantity) {
            return { success: false, error: `Stock insuficiente. Solo quedan ${product.quantity} unidades.` };
        }

        // Descontar stock
        product.quantity -= result.data.quantity;
        await writeData(productsFilePath, productsData);
        
        // Crear préstamo
        const newLoan: Loan = {
            ...result.data,
            id: (Date.now() + Math.random()).toString(36),
            status: "Prestado",
        };

        loansData.loans.push(newLoan);
        await writeData(loansFilePath, loansData);

        return { success: true, data: newLoan };
    } catch (e: any) {
        console.error("Failed to save loan:", e);
        return { success: false, error: e.message || "Ocurrió un error desconocido." };
    }
}

export async function updateLoanStatus(loanId: string, status: 'Prestado' | 'Devuelto'): Promise<{ success: boolean; error?: string }> {
    try {
        const loansData = await readData(loansFilePath, { loans: [] });
        const loanIndex = loansData.loans.findIndex(l => l.id === loanId);
        if (loanIndex === -1) {
            return { success: false, error: 'No se encontró el préstamo.' };
        }

        const loan = loansData.loans[loanIndex];
        if (loan.status === status) {
             return { success: true }; // No hay cambios que hacer
        }

        // Solo reponer stock si se marca como Devuelto
        if (status === 'Devuelto') {
            const productsData = await readData(productsFilePath, { products: [] });
            const productIndex = productsData.products.findIndex(p => p.id === loan.productId);
            if (productIndex !== -1) {
                productsData.products[productIndex].quantity += loan.quantity;
                await writeData(productsFilePath, productsData);
            }
        }
        
        loan.status = status;
        await writeData(loansFilePath, loansData);
        return { success: true };

    } catch (e: any) {
        console.error('Failed to update loan status:', e);
        return { success: false, error: e.message || 'Ocurrió un error desconocido.' };
    }
}

export async function deleteLoan(loanId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const loansData = await readData(loansFilePath, { loans: [] });
        const initialCount = loansData.loans.length;
        loansData.loans = loansData.loans.filter(l => l.id !== loanId);

        if (loansData.loans.length === initialCount) {
            return { success: false, error: 'No se encontró el préstamo a eliminar.' };
        }

        // Nota: Eliminar un préstamo NO repone el stock. Se debe marcar como devuelto primero.
        // Si el préstamo se elimina en estado "Prestado", ese stock se considera perdido.

        await writeData(loansFilePath, loansData);
        return { success: true };
    } catch (e: any) {
        console.error('Failed to delete loan:', e);
        return { success: false, error: e.message || 'Ocurrió un error desconocido.' };
    }
}
