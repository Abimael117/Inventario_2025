"use client";

import { useState } from "react";
import { PlusCircle, MoreHorizontal, CheckCircle, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLoanForm } from "./add-loan-form";

type LoansClientProps = {
  loans: Loan[];
  products: Product[];
};

export default function LoansClient({ loans: initialLoans, products }: LoansClientProps) {
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddLoan = (newLoanData: Omit<Loan, 'id' | 'status'>) => {
    const newLoan: Loan = {
      ...newLoanData,
      id: `LOAN${(Math.random() * 1000).toFixed(0).padStart(3, '0')}`,
      status: 'Prestado',
    };
    setLoans([newLoan, ...loans]);
    toast({
      title: "Éxito",
      description: `El préstamo para "${newLoan.productName}" ha sido registrado.`,
    });
    setIsAddDialogOpen(false);
  };
  
  const handleMarkAsReturned = (loanId: string) => {
    setLoans(loans.map(loan => 
      loan.id === loanId ? { ...loan, status: 'Devuelto' } : loan
    ));
    toast({
        title: "Actualizado",
        description: "El préstamo ha sido marcado como devuelto.",
    });
  };

  return (
    <>
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
                        {loans.map((loan) => (
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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        onSelect={() => handleMarkAsReturned(loan.id)}
                                        disabled={loan.status === 'Devuelto'}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Devuelto
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))}
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
    </>
  );
}
