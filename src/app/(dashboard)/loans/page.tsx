
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, runTransaction, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import LoansClient from "@/components/loans/loans-client";
import type { Loan, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError, errorEmitter } from '@/firebase';
import { format } from 'date-fns';

export default function LoansPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  const loansRef = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);

  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansRef);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  const handleAddLoan = (loanData: Omit<Loan, 'id' | 'status'>) => {
    if (!firestore) return;
    startTransition(() => {
        const productRef = doc(firestore, 'products', loanData.productId);
        const loanRef = doc(collection(firestore, 'loans'));

        runTransaction(firestore, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error("El producto que intentas prestar no existe.");
            }

            const product = productDoc.data() as Product;
            if (product.quantity < loanData.quantity) {
                throw new Error(`Stock insuficiente. Solo quedan ${product.quantity} unidades de "${product.name}".`);
            }

            const newQuantity = product.quantity - loanData.quantity;
            transaction.update(productRef, { quantity: newQuantity });
            transaction.set(loanRef, { ...loanData, status: 'Prestado', id: loanRef.id });
        })
        .then(() => {
            toast({
                title: "Préstamo Registrado",
                description: `El préstamo para "${loanData.productName}" ha sido guardado.`,
            });
            setIsAddDialogOpen(false);
        })
        .catch(async (error: any) => {
            if (error.code) {
                const permissionError = new FirestorePermissionError({
                    path: productRef.path,
                    operation: 'write',
                    requestResourceData: loanData
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error al registrar",
                    description: error.message || "No se pudo registrar el préstamo.",
                });
            }
        });
    });
  };
  
  const handleMarkAsReturned = (loan: Loan) => {
    if (!firestore) return;
    startTransition(() => {
        const loanRef = doc(firestore, 'loans', loan.id);
        
        runTransaction(firestore, async (transaction) => {
            const loanDoc = await transaction.get(loanRef);
            if (!loanDoc.exists() || loanDoc.data().status === 'Devuelto') {
                throw new Error("Este préstamo no se puede devolver o ya ha sido devuelto.");
            }

            const loanData = loanDoc.data() as Loan;
            const productRef = doc(firestore, 'products', loanData.productId);
            const productDoc = await transaction.get(productRef);

            if (productDoc.exists()) {
                const newQuantity = (productDoc.data().quantity || 0) + loanData.quantity;
                transaction.update(productRef, { quantity: newQuantity });
            }

            const returnDate = format(new Date(), "yyyy-MM-dd");
            transaction.update(loanRef, { status: 'Devuelto', returnDate: returnDate });
        })
        .then(() => {
             toast({
                title: "Préstamo Actualizado",
                description: "El producto ha sido marcado como devuelto y el stock ha sido repuesto.",
            });
        })
        .catch(async (error: any) => {
            if (error.code) {
                 const permissionError = new FirestorePermissionError({
                    path: loanRef.path,
                    operation: 'write',
                    requestResourceData: { status: 'Devuelto' }
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                 toast({
                    variant: "destructive",
                    title: "Error al actualizar",
                    description: error.message || "No se pudo actualizar el estado del préstamo.",
                });
            }
        });
    });
  };

  const handleDeleteClick = (loan: Loan) => {
    setLoanToDelete(loan);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (loanToDelete && firestore) {
      startTransition(async () => {
        const loanRef = doc(firestore, 'loans', loanToDelete.id);
        const loanSnap = await getDoc(loanRef);
        if (loanSnap.exists() && loanSnap.data().status === 'Prestado') {
             toast({ variant: "destructive", title: "Acción no permitida", description: 'No se puede eliminar un préstamo que está activo. Primero márcalo como "Devuelto".' });
             setIsDeleteDialogOpen(false);
             setLoanToDelete(null);
             return;
        }

        deleteDoc(loanRef)
            .then(() => {
                toast({
                    title: "Préstamo Eliminado",
                    description: `El registro del préstamo para "${loanToDelete.productName}" ha sido eliminado.`,
                });
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: loanRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsDeleteDialogOpen(false);
                setLoanToDelete(null);
            });
      });
    }
  };
  
  if (isLoadingLoans || isLoadingProducts) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="text-muted-foreground mt-2">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
        <LoansClient 
            loans={loans || []} 
            products={products || []}
            isPending={isPending}
            isAddDialogOpen={isAddDialogOpen}
            setIsAddDialogOpen={setIsAddDialogOpen}
            isDeleteDialogOpen={isDeleteDialogOpen}
            loanToDelete={loanToDelete}
            onAddLoan={handleAddLoan}
            onMarkAsReturned={handleMarkAsReturned}
            onDeleteClick={handleDeleteClick}
            onConfirmDelete={confirmDelete}
            onCancelDelete={() => setIsDeleteDialogOpen(false)}
        />
    </div>
  );
}
