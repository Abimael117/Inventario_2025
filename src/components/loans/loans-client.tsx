
"use client";

import { useState } from "react";
import { PlusCircle, MoreHorizontal, CheckCircle, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, doc } from "firebase/firestore";

import type { Loan, Product } from "@/lib/types";
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useFirebase } from "@/firebase";
import { LoanReceipt } from "./loan-receipt";

type LoansClientProps = {
  loans: Loan[];
  products: Product[];
};

export default function LoansClient({ loans, products }: LoansClientProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [loanToPrint, setLoanToPrint] = useState<Loan | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const handleAddLoan = (newLoanData: Omit<Loan, 'id' | 'status'>) => {
    if (firestore) {
      const newLoan: Omit<Loan, 'id'> = {
        ...newLoanData,
        status: 'Prestado',
      };
      const loansCollection = collection(firestore, "loans");
      addDocumentNonBlocking(loansCollection, newLoan);
      toast({
        title: "Éxito",
        description: `El préstamo para "${newLoan.productName}" ha sido registrado.`,
      });
      setIsAddDialogOpen(false);
    }
  };
  
  const handleMarkAsReturned = (loanId: string) => {
    if (firestore) {
        const loanRef = doc(firestore, 'loans', loanId);
        updateDocumentNonBlocking(loanRef, { status: 'Devuelto' });
        toast({
            title: "Actualizado",
            description: "El préstamo ha sido marcado como devuelto.",
        });
    }
  };

  const handleDeleteClick = (loan: Loan) => {
    setLoanToDelete(loan);
    setIsDeleteDialogOpen(true);
  };

  const handlePrintClick = (loan: Loan) => {
    setLoanToPrint(loan);
    setIsReceiptDialogOpen(true);
  };

  const confirmDelete = () => {
    if (loanToDelete && firestore) {
      const loanRef = doc(firestore, "loans", loanToDelete.id);
      deleteDocumentNonBlocking(loanRef);
      toast({
        title: "Éxito",
        description: `El préstamo para "${loanToDelete.productName}" ha sido eliminado.`,
      });
      setLoanToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handlePrint = () => {
    // We need a short timeout to ensure the state has updated
    // and the `loanToPrint` is set before triggering the print.
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <>
      <div className="print-hide">
        <AppHeader title="Préstamos">
          <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
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
                              <TableHead>Estado</TableHead>
                              <TableHead>
                              <span className="sr-only">Acciones</span>
                              </TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loans.length > 0 ? (
                              loans.map((loan) => (
                                <TableRow key={loan.id}>
                                <TableCell className="font-medium">{loan.productName}</TableCell>
                                <TableCell>{loan.requester}</TableCell>
                                <TableCell>
                                    {format(new Date(loan.loanDate), "d 'de' MMMM, yyyy", { locale: es })}
                                </TableCell>
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
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
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
                                            onSelect={() => handleMarkAsReturned(loan.id)}
                                            disabled={loan.status === 'Devuelto'}
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Devuelto
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={() => handleDeleteClick(loan)}
                                          disabled={loan.status !== 'Devuelto'}
                                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                </TableRow>
                              ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
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

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
                <DialogDescription>
                Rellena los detalles del nuevo préstamo.
                </DialogDescription>
            </DialogHeader>
            <AddLoanForm onSubmit={handleAddLoan} products={products} />
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el préstamo del producto "{loanToDelete?.productName}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
            <DialogContent className="w-full max-w-3xl">
            <DialogHeader>
                <DialogTitle>Vista Previa del Comprobante</DialogTitle>
                <DialogDescription>
                Así es como se verá tu comprobante. Puedes editar los campos de "Entregado por" y "Recibido por" antes de imprimir.
                </DialogDescription>
            </DialogHeader>
            {loanToPrint && <LoanReceipt loan={loanToPrint} />}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="print-only">
        {loanToPrint && <LoanReceipt loan={loanToPrint} />}
      </div>
    </>
  );
}
