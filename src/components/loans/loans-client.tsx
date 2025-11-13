
"use client";

import { useState } from "react";
import { PlusCircle, MoreHorizontal, CheckCircle, Trash2, Loader2, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import type { Loan, Product } from "@/lib/types";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLoanForm } from "./add-loan-form";
import AppHeader from "../header";

type LoansClientProps = {
  loans: Loan[];
  products: Product[];
  isPending: boolean;
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: (isOpen: boolean) => void;
  isDeleteDialogOpen: boolean;
  loanToDelete: Loan | null;
  onAddLoan: (loanData: Omit<Loan, 'id' | 'status'>) => void;
  onMarkAsReturned: (loan: Loan) => void;
  onDeleteClick: (loan: Loan) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

export default function LoansClient({ 
    loans, 
    products, 
    isPending, 
    isAddDialogOpen, 
    setIsAddDialogOpen,
    isDeleteDialogOpen,
    loanToDelete,
    onAddLoan,
    onMarkAsReturned,
    onDeleteClick,
    onConfirmDelete,
    onCancelDelete
}: LoansClientProps) {
 
  const sortedLoans = (loans || []).sort((a, b) => {
    const dateA = a.loanDate || '';
    const dateB = b.loanDate || '';
    return dateB.localeCompare(dateA);
  });
  
  const handlePrintReceipt = (loan: Loan) => {
    sessionStorage.setItem('printableLoan', JSON.stringify(loan));
    window.open('/print/loan-receipt', '_blank');
  };


  return (
    <>
      <div className="flex flex-1 flex-col">
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
                              {sortedLoans && sortedLoans.length > 0 ? (
                                sortedLoans.map((loan) => {
                                  let formattedDate = "Fecha inválida";
                                  if (loan.loanDate && typeof loan.loanDate === 'string' && loan.loanDate.includes('-')) {
                                      try {
                                          const [year, month, day] = loan.loanDate.split('-').map(Number);
                                          const dateObject = new Date(Date.UTC(year, month - 1, day));
                                          if (!isNaN(dateObject.getTime())) {
                                              formattedDate = format(dateObject, "d 'de' MMMM, yyyy", { locale: es });
                                          }
                                      } catch (e) {
                                          console.error("Failed to parse date:", loan.loanDate, e);
                                      }
                                  }
                                  
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
                                          <DropdownMenuItem onSelect={() => handlePrintReceipt(loan)}>
                                            <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                              onSelect={() => onMarkAsReturned(loan)}
                                              disabled={loan.status === 'Devuelto' || isPending}
                                          >
                                              <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Devuelto
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onSelect={() => onDeleteClick(loan)}
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
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={!isPending ? setIsAddDialogOpen : undefined}>
          <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
              <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
              <DialogDescription>
              Rellena los detalles del nuevo préstamo. El stock del producto se actualizará automáticamente.
              </DialogDescription>
          </DialogHeader>
          <AddLoanForm onSubmit={onAddLoan} products={products} isPending={isPending} />
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={!isPending ? onCancelDelete : undefined}>
          <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                  Esta acción eliminará permanentemente el registro del préstamo para "{loanToDelete?.productName}". Esta acción solo debe realizarse en préstamos ya devueltos.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel onClick={onCancelDelete}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Eliminar"}
              </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
