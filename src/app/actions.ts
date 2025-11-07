'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { Product, Loan, StockMovement, User } from '@/lib/types';
import { collection, writeBatch, doc, getDoc, setDoc, deleteDoc, runTransaction, getDocs, query, where } from 'firebase/firestore';
import { getSdks } from '@/firebase/server';

const productSchema = z.object({
    id: z.string().min(1, "El ID es obligatorio."),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    category: z.string().min(2, "La categoría debe tener al menos 2 caracteres."),
    location: z.string().min(2, "La ubicación debe tener al menos 2 caracteres."),
    quantity: z.coerce.number().int().min(0, "La cantidad no puede ser negativa."),
    reorderPoint: z.coerce.number().int().min(0, "El punto de reorden no puede ser negativa."),
});

const loanSchema = z.object({
    productId: z.string(),
    productName: z.string(),
    requester: z.string().min(2, "El solicitante debe tener al menos 2 caracteres."),
    loanDate: z.string(), // ISO string
    quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
});


const stockAdjustmentSchema = z.object({
  quantity: z.coerce.number().int().gt(0, "La cantidad a descontar debe ser mayor que cero."),
  reason: z.string().min(3, "La razón debe tener al menos 3 caracteres."),
});


// JSON file paths
const productsFilePath = path.join(process.cwd(), 'src', 'lib', 'data', 'products.json');
const loansFilePath = path.join(process.cwd(), 'src', 'lib', 'data', 'loans.json');


// HELPERS
async function readData<T>(filePath: string): Promise<T | null> {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
             console.warn(`File not found, skipping seed: ${filePath}`);
             return null;
        }
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
}

// PRODUCT SEEDING ACTION
export async function seedProducts(): Promise<{ success: boolean; error?: string; count?: number }> {
    const { firestore } = await getSdks();
    try {
        const productsData = await readData<{ products: Product[] }>(productsFilePath);

        if (!productsData || !productsData.products || productsData.products.length === 0) {
            return { success: true, count: 0 };
        }

        const batch = writeBatch(firestore);
        const productsRef = collection(firestore, 'products');

        let seededCount = 0;
        for (const product of productsData.products) {
            if(!product.id) {
                console.warn(`Skipping product without ID: ${product.name}`);
                continue;
            }
            // Check if product already exists
            const docRef = doc(productsRef, product.id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                batch.set(docRef, product);
                seededCount++;
            }
        }
        
        if (seededCount > 0) {
          await batch.commit();
        }

        return { success: true, count: seededCount };
    } catch (error: any) {
        console.error('Failed to seed products:', error);
        return { success: false, error: error.message || 'An unknown error occurred during seeding.' };
    }
}


// PRODUCT ACTIONS
export async function saveProduct(idToken: string, newProduct: Product): Promise<{ success: boolean, error?: string, data?: Product }> {
  const result = productSchema.safeParse(newProduct);

  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Datos de producto inválidos." };
  }
  
  const { firestore } = await getSdks(idToken);
  try {
    const productRef = doc(firestore, 'products', result.data.id);
    
    const docSnap = await getDoc(productRef);
    if (docSnap.exists()) {
        return { success: false, error: 'Este ID de producto ya existe. Por favor, utiliza uno único.' };
    }

    await setDoc(productRef, result.data);

    return { success: true, data: result.data };

  } catch (error: any) {
    console.error('Failed to save product to Firestore:', error);
    return { success: false, error: error.message || 'No se pudo guardar el producto. Revisa los permisos.' };
  }
}

export async function updateProduct(idToken: string, productId: string, updatedData: Partial<Omit<Product, 'id'>>): Promise<{ success: boolean; error?: string; data?: Product }> {
    const updateSchema = productSchema.omit({ id: true }).partial();
    const result = updateSchema.safeParse(updatedData);

    if (!result.success) {
        const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, error: firstError || "Datos de actualización inválidos." };
    }

    if (Object.keys(result.data).length === 0) {
        return { success: false, error: "No hay datos para actualizar." };
    }

    const { firestore } = await getSdks(idToken);
    try {
        const productRef = doc(firestore, 'products', productId);

        await setDoc(productRef, result.data, { merge: true });
        
        const updatedDoc = await getDoc(productRef);
        const finalData = updatedDoc.data() as Product;

        return { success: true, data: finalData };
    } catch (error: any) {
        console.error('Failed to update product in Firestore:', error);
        return { success: false, error: error.message || 'An unknown error occurred while updating.' };
    }
}

export async function deleteProduct(idToken: string, productId: string): Promise<{ success: boolean; error?: string; }> {
    const { firestore } = await getSdks(idToken);
    try {
        const loansQuery = query(collection(firestore, 'loans'), where('productId', '==', productId), where('status', '==', 'Prestado'));
        const activeLoansSnapshot = await getDocs(loansQuery);
        
        if (!activeLoansSnapshot.empty) {
            return { success: false, error: `No se puede eliminar. Hay ${activeLoansSnapshot.size} préstamo(s) activo(s) para este producto.` };
        }

        const productRef = doc(firestore, 'products', productId);
        await deleteDoc(productRef);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete product from Firestore:', error);
        return { success: false, error: error.message || 'An unknown error occurred' };
    }
}

// STOCK ADJUSTMENT ACTION
export async function adjustStock(idToken: string, productId: string, adjustmentData: { quantity: number; reason: string }): Promise<{ success: boolean; error?: string; }> {
  const result = stockAdjustmentSchema.safeParse(adjustmentData);

  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Datos de ajuste inválidos." };
  }

  const { firestore } = await getSdks(idToken);
  try {
    const productRef = doc(firestore, 'products', productId);
    
    await runTransaction(firestore, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
            throw new Error("No se encontró el producto.");
        }

        const product = productDoc.data() as Product;
        if (result.data.quantity > product.quantity) {
            throw new Error(`Stock insuficiente. Solo hay ${product.quantity} unidades.`);
        }

        const newQuantity = product.quantity - result.data.quantity;
        transaction.update(productRef, { quantity: newQuantity });

        const movementRef = doc(collection(firestore, `movements`));
        const newMovement: StockMovement = {
            id: movementRef.id,
            productId: product.id,
            productName: product.name,
            quantity: result.data.quantity,
            type: 'descuento',
            reason: result.data.reason,
            date: new Date().toISOString(),
        };
        transaction.set(movementRef, newMovement);
    });

    return { success: true };

  } catch (e: any) {
    console.error("Failed to adjust stock:", e);
    return { success: false, error: e.message || "Ocurrió un error desconocido." };
  }
}


// LOAN SEEDING ACTION
export async function seedLoans(): Promise<{ success: boolean; error?: string; count?: number }> {
    const { firestore } = await getSdks();
    try {
        const loansData = await readData<{ loans: Loan[] }>(loansFilePath);

        if (!loansData || !loansData.loans || loansData.loans.length === 0) {
            return { success: true, count: 0 };
        }

        const batch = writeBatch(firestore);
        const loansRef = collection(firestore, 'loans');

        let seededCount = 0;
        for (const loan of loansData.loans) {
             const docRef = doc(loansRef, loan.id);
             const docSnap = await getDoc(docRef);
             if (!docSnap.exists()) {
                batch.set(docRef, loan);
                seededCount++;
             }
        }

        if (seededCount > 0) {
            await batch.commit();
        }

        return { success: true, count: seededCount };
    } catch (error: any) {
        console.error('Failed to seed loans:', error);
        return { success: false, error: error.message || 'An unknown error occurred during seeding.' };
    }
}

// LOAN ACTIONS
export async function saveLoan(idToken: string, loanData: Omit<Loan, 'id' | 'status'>): Promise<{ success: boolean, error?: string, data?: Loan }> {
    const result = loanSchema.safeParse(loanData);
    if (!result.success) {
        const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, error: firstError || "Datos de préstamo inválidos." };
    }
    
    const { firestore } = await getSdks(idToken);

    try {
        const newLoanRef = doc(collection(firestore, 'loans'));
        const newLoanId = newLoanRef.id;
        
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, 'products', result.data.productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) {
                throw new Error("El producto seleccionado ya no existe.");
            }

            const product = productDoc.data() as Product;
            if (product.quantity < result.data.quantity) {
                throw new Error(`Stock insuficiente. Solo quedan ${product.quantity} unidades.`);
            }
            
            const newQuantity = product.quantity - result.data.quantity;
            transaction.update(productRef, { quantity: newQuantity });

            const newLoan: Loan = {
                ...result.data,
                id: newLoanId,
                status: "Prestado",
            };
            transaction.set(newLoanRef, newLoan);
        });

        const savedLoan = await getDoc(newLoanRef);

        return { success: true, data: savedLoan.data() as Loan };

    } catch (e: any) {
        console.error("Failed to save loan:", e);
        return { success: false, error: e.message || "Ocurrió un error desconocido." };
    }
}

export async function updateLoanStatus(idToken: string, loanId: string, status: 'Prestado' | 'Devuelto'): Promise<{ success: boolean; error?: string }> {
    const { firestore } = await getSdks(idToken);
    
    try {
        const loanRef = doc(firestore, 'loans', loanId);
        
        await runTransaction(firestore, async (transaction) => {
            const loanDoc = await transaction.get(loanRef);
            if (!loanDoc.exists()) {
                throw new Error('No se encontró el préstamo.');
            }

            const loan = loanDoc.data() as Loan;
            if (loan.status === status) {
                 return; // No change needed
            }

            // Only update product stock if loan is being returned
            if (status === 'Devuelto' && loan.status === 'Prestado') {
                const productRef = doc(firestore, 'products', loan.productId);
                const productDoc = await transaction.get(productRef);
                if (productDoc.exists()) {
                    const newQuantity = (productDoc.data().quantity || 0) + loan.quantity;
                    transaction.update(productRef, { quantity: newQuantity });
                } else {
                    // If product was deleted, we can't restock it, but we can still mark loan as returned.
                    console.warn(`Product with ID ${loan.productId} not found for restocking.`);
                }
            }
            
            transaction.update(loanRef, { status: status, returnDate: new Date().toISOString() });
        });

        return { success: true };

    } catch (e: any) {
        console.error('Failed to update loan status:', e);
        return { success: false, error: e.message || 'Ocurrió un error desconocido.' };
    }
}

export async function deleteLoan(idToken: string, loanId: string): Promise<{ success: boolean; error?: string }> {
    const { firestore } = await getSdks(idToken);
    try {
        const loanRef = doc(firestore, 'loans', loanId);
        const loanDoc = await getDoc(loanRef);

        if (!loanDoc.exists()) {
            return { success: false, error: 'No se encontró el préstamo a eliminar.' };
        }
        
        if (loanDoc.data().status === 'Prestado') {
             return { success: false, error: 'No se puede eliminar un préstamo activo. Primero debe marcarse como "Devuelto".' };
        }
        
        await deleteDoc(loanRef);
        return { success: true };
    } catch (e: any) {
        console.error('Failed to delete loan:', e);
        return { success: false, error: e.message || 'Ocurrió un error desconocido.' };
    }
}
