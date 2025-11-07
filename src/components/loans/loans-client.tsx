
"use client";

import { useState, useTransition } from "react";
import { PlusCircle, MoreHorizontal, CheckCircle, Trash2, Printer, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from 'next/navigation';
import { doc, setDoc, deleteDoc, collection, runTransaction, getDoc } from 'firebase/firestore';

import type { Loan, Product } from "@/lib/types";
import { useFirestore } from '@/firebase';
import AppHeader from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLoanForm } from "./add-loan-form";
import { LoanReceipt } from "./loan-receipt";

type LoansClientProps = {
  loans: Loan[];
  products: Product[];
};

// Robust helper function to parse date values
const parseDate = (date: string | Date | null | undefined): Date => {
  // If it's already a valid Date object, return it.
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  
  // If it's a string, try to parse it.
  if (typeof date === 'string') {
    // Handles 'YYYY-MM-DD' strings by splitting and creating a new Date.
    // The UTC constructor Date(year, month, day) prevents timezone shifts.
    const parts = date.split('-').map(Number);
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // The month is 0-indexed in JavaScript's Date, so subtract 1.
        return new Date(Date.UTC(year, month - 1, day));
      }
    }
  }

  // If input is null, undefined, or an invalid string, return an invalid date.
  // `format` from date-fns will handle this gracefully.
  return new Date(NaN);
};


export default function LoansClient({ loans, products }: LoansClientProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const [isPending, startTransition] = useTransition();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [loanToPrint, setLoanToPrint] = useState<Loan | null>(null);
  const [entregadoPor, setEntregadoPor] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');
  const { toast } = useToast();

  const handleAddLoan = async (loanData: Omit<Loan, 'id' | 'status'>) => {
    if (!firestore) return;
    startTransition(async () => {
        try {
            const productRef = doc(firestore, 'products', loanData.productId);
            const loanRef = doc(collection(firestore, 'loans'));

            await runTransaction(firestore, async (transaction) => {
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
            });

            toast({
                title: "Préstamo Registrado",
                description: `El préstamo para "${loanData.productName}" ha sido guardado.`,
            });
            setIsAddDialogOpen(false);
            router.refresh();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al registrar",
                description: error.message || "No se pudo registrar el préstamo.",
            });
        }
    });
  };
  
  const handleMarkAsReturned = async (loan: Loan) => {
    if (!firestore) return;
    startTransition(async () => {
        try {
            const loanRef = doc(firestore, 'loans', loan.id);
            await runTransaction(firestore, async (transaction) => {
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

                const returnDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                transaction.update(loanRef, { status: 'Devuelto', returnDate: returnDate });
            });
             toast({
                title: "Préstamo Actualizado",
                description: "El producto ha sido marcado como devuelto y el stock ha sido repuesto.",
            });
            router.refresh();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al actualizar",
                description: error.message || "No se pudo actualizar el estado del préstamo.",
            });
        }
    });
  };

  const handleDeleteClick = (loan: Loan) => {
    setLoanToDelete(loan);
    setIsDeleteDialogOpen(true);
  };

  const handlePrintClick = (loan: Loan) => {
    setLoanToPrint(loan);
    setEntregadoPor('');
    setRecibidoPor(loan.requester);
    setIsReceiptDialogOpen(true);
  };

  const confirmDelete = () => {
    if (loanToDelete && firestore) {
      startTransition(async () => {
        try {
            const loanRef = doc(firestore, 'loans', loanToDelete.id);
            const loanSnap = await getDoc(loanRef);
            if (loanSnap.exists() && loanSnap.data().status === 'Prestado') {
                 toast({ variant: "destructive", title: "Acción no permitida", description: 'No se puede eliminar un préstamo que está activo. Primero márcalo como "Devuelto".' });
                 return;
            }

            await deleteDoc(loanRef);
            toast({
                title: "Préstamo Eliminado",
                description: `El registro del préstamo para "${loanToDelete.productName}" ha sido eliminado.`,
            });
            router.refresh();
        } catch(error: any) {
             toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: error.message || "No se pudo eliminar el registro del préstamo.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setLoanToDelete(null);
        }
      });
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const sortedLoans = [...loans].sort((a, b) => {
    // We need to parse our 'YYYY-MM-DD' strings into actual Date objects for sorting
    const dateA = parseDate(a.loanDate);
    const dateB = parseDate(b.loanDate);
    // Handle invalid dates by pushing them to the end
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    return dateB.getTime() - dateA.getTime();
  });


  return (
    <>
      <div className="print-hide">
        <AppHeader title="Préstamos">
          <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)} disabled={isPending}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Registrar Préstamo
              </Button>
          </div>
        </AppHeader>
        <main className="flex-1 p-4 md:p-6">
          <Card>
              <CardHeader>
                  <CardTitle>Historial de Préstamos</CardTitle>
                  <CardDescription>Gestiona los productos prestados a equipos o personal.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                          <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Solicitante</TableHead>
                              <TableHead>Fecha de Préstamo</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>
                              <span className="sr-only">Acciones</span>
                              </TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedLoans.length > 0 ? (
                              sortedLoans.map((loan) => {
                                const formattedDate = format(parseDate(loan.loanDate), "d 'de' MMMM, yyyy", { locale: es });
                                return (
                                <TableRow key={loan.id}>
                                <TableCell className="font-medium">{loan.productName}</TableCell>
                                <TableCell>{loan.requester}</TableCell>
                                <TableCell>
                                    {formattedDate}
                                </TableCell>
                                <TableCell className="text-right">{loan.quantity}</TableCell>
                                <TableCell>
                                    <Badge
                                    variant={
                                        loan.status === 'Prestado'
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    >
                                    {loan.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPending}>
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Alternar menú</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => handlePrintClick(loan)}>
                                          <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            onSelect={() => handleMarkAsReturned(loan)}
                                            disabled={loan.status === 'Devuelto' || isPending}
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Devuelto
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={() => handleDeleteClick(loan)}
                                          disabled={loan.status !== 'Devuelto' || isPending}
                                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                </TableRow>
                               );
                              })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                    No hay préstamos registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={!isPending ? setIsAddDialogOpen : undefined}>
            <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
                <DialogDescription>
                Rellena los detalles del nuevo préstamo. El stock del producto se actualizará automáticamente.
                </DialogDescription>
            </DialogHeader>
            <AddLoanForm onSubmit={handleAddLoan} products={products} isPending={isPending} />
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={!isPending ? setIsDeleteDialogOpen : undefined}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción eliminará permanentemente el registro del préstamo para "{loanToDelete?.productName}". Esta acción solo debe realizarse en préstamos ya devueltos.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Eliminar"}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen} >
            <DialogContent className="w-full max-w-3xl loan-receipt-printable-area">
              <DialogHeader className="print-hide-in-dialog">
                  <DialogTitle>Vista Previa del Comprobante</DialogTitle>
                  <DialogDescription>
                  Así es como se verá tu comprobante. Puedes editar los campos antes de imprimir.
                  </DialogDescription>
              </DialogHeader>
              {loanToPrint && (
                <LoanReceipt 
                  loan={loanToPrint} 
                  entregadoPor={entregadoPor}
                  recibidoPor={recibidoPor}
                  setEntregadoPor={setEntregadoPor}
                  setRecibidoPor={setRecibidoPor}
                />
              )}
              <DialogFooter className="print-hide-in-dialog">
                  <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

    