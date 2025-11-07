
'use server';

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

// PRODUCT ACTIONS
export async function saveProduct(newProduct: Product): Promise<{ success: boolean, error?: string, data?: Product }> {
  const result = productSchema.safeParse(newProduct);

  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || "Datos de producto inválidos." };
  }
  
  try {
    const { firestore } = await getSdks();
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

export async function updateProduct(productId: string, updatedData: Partial<Omit<Product, 'id'>>): Promise<{ success: boolean; error?: string; data?: Product }> {
    const updateSchema = productSchema.omit({ id: true }).partial();
    const result = updateSchema.safeParse(updatedData);

    if (!result.success) {
        const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, error: firstError || "Datos de actualización inválidos." };
    }

    if (Object.keys(result.data).length === 0) {
        return { success: false, error: "No hay datos para actualizar." };
    }

    try {
        const { firestore } = await getSdks();
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

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string; }> {
    try {
        const { firestore } = await getSdks();
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


export async function deleteAllData(): Promise<{ success: boolean, error?: string }> {
    try {
        const { firestore } = await getSdks();
        const batch = writeBatch(firestore);

        const productsSnapshot = await getDocs(collection(firestore, 'products'));
        productsSnapshot.forEach(doc => batch.delete(doc.ref));

        const loansSnapshot = await getDocs(collection(firestore, 'loans'));
        loansSnapshot.forEach(doc => batch.delete(doc.ref));

        const movementsSnapshot = await getDocs(collection(firestore, 'movements'));
        movementsSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        return { success: true };

    } catch (error: any) {
        console.error('Failed to delete all data from Firestore:', error);
        return { success: false, error: error.message || 'No se pudo eliminar toda la información.' };
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
    const { firestore } = await getSdks();
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
    console.error('Failed to adjust stock:', e);
    return { success: false, error: e.message || 'Ocurrió un error desconocido al ajustar el stock.' };
  }
}

// LOAN ACTIONS
export async function saveLoan(loan: Omit<Loan, 'id' | 'status'>): Promise<{ success: boolean; error?: string; data?: Loan }> {
    const newLoanData = {
        ...loan,
        status: 'Prestado' as const,
    };

    try {
        const { firestore } = await getSdks();
        const productRef = doc(firestore, 'products', loan.productId);
        const loanRef = doc(collection(firestore, 'loans'));

        await runTransaction(firestore, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error("El producto que intentas prestar no existe.");
            }

            const product = productDoc.data() as Product;
            if (product.quantity < loan.quantity) {
                throw new Error(`Stock insuficiente. Solo quedan ${product.quantity} unidades de "${product.name}".`);
            }

            const newQuantity = product.quantity - loan.quantity;
            transaction.update(productRef, { quantity: newQuantity });
            transaction.set(loanRef, { ...newLoanData, id: loanRef.id });
        });

        const finalData = { ...newLoanData, id: loanRef.id };
        return { success: true, data: finalData };

    } catch (error: any) {
        console.error('Failed to save loan:', error);
        return { success: false, error: error.message || 'No se pudo guardar el préstamo.' };
    }
}

export async function updateLoanStatus(loanId: string, status: 'Devuelto'): Promise<{ success: boolean; error?: string }> {
    if (status !== 'Devuelto') {
        return { success: false, error: "Estado no válido." };
    }

    try {
        const { firestore } = await getSdks();
        const loanRef = doc(firestore, 'loans', loanId);

        await runTransaction(firestore, async (transaction) => {
            const loanDoc = await transaction.get(loanRef);
            if (!loanDoc.exists() || loanDoc.data().status === 'Devuelto') {
                throw new Error("Este préstamo no se puede devolver o ya ha sido devuelto.");
            }

            const loan = loanDoc.data() as Loan;
            const productRef = doc(firestore, 'products', loan.productId);
            const productDoc = await transaction.get(productRef);

            if (productDoc.exists()) {
                const newQuantity = (productDoc.data().quantity || 0) + loan.quantity;
                transaction.update(productRef, { quantity: newQuantity });
            }

            transaction.update(loanRef, { status: 'Devuelto', returnDate: new Date().toISOString() });
        });

        return { success: true };
    } catch (error: any) {
        console.error('Failed to update loan status:', error);
        return { success: false, error: error.message || 'No se pudo actualizar el préstamo.' };
    }
}

export async function deleteLoan(loanId: string): Promise<{ success: boolean; error?: string; }> {
    try {
        const { firestore } = await getSdks();
        const loanRef = doc(firestore, 'loans', loanId);
        
        const loanSnap = await getDoc(loanRef);
        if (loanSnap.exists() && loanSnap.data().status === 'Prestado') {
             return { success: false, error: 'No se puede eliminar un préstamo que está activo. Primero márcalo como "Devuelto".' };
        }

        await deleteDoc(loanRef);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete loan:', error);
        return { success: false, error: error.message || 'An unknown error occurred' };
    }
}
