
'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, Printer, X, Boxes } from 'lucide-react';
import type { Loan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PrintLoanReceipt = ({ loan }: { loan: Loan }) => {
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
    <div className="bg-white text-black p-8 font-sans max-w-2xl mx-auto border-2 border-gray-300">
      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-300">
        <div className="flex items-center gap-3">
          <Boxes className="size-12 text-primary" />
          <div>
            <h1 className="text-xl font-bold">D.E.C.D</h1>
            <p className="text-sm text-gray-600">Dirección de Educación, Cultura y Deporte</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-800">Comprobante de Préstamo</h2>
          <p className="text-sm text-gray-600">Folio: {loan.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </header>
      
      <main className="mt-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">Detalles del Préstamo</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="font-bold text-gray-600">Solicitante:</p>
              <p className="text-lg">{loan.requester}</p>
            </div>
            <div>
              <p className="font-bold text-gray-600">Fecha de Préstamo:</p>
              <p className="text-lg">{formattedDate}</p>
            </div>
            <div>
              <p className="font-bold text-gray-600">Producto Prestado:</p>
              <p className="text-lg">{loan.productName}</p>
            </div>
            <div>
              <p className="font-bold text-gray-600">Cantidad:</p>
              <p className="text-lg">{loan.quantity} unidad(es)</p>
            </div>
          </div>
        </div>

        <div className="pt-16 text-center text-sm grid grid-cols-2 gap-8">
            <div>
                <div className="border-t border-gray-400 w-2/3 mx-auto pt-2">
                    <p className="font-semibold">Entregado por:</p>
                    <p className="mt-1 text-gray-500">(Nombre y Firma)</p>
                </div>
            </div>
            <div>
                <div className="border-t border-gray-400 w-2/3 mx-auto pt-2">
                    <p className="font-semibold">Recibido por:</p>
                    <p className="mt-1 text-gray-500">(Nombre y Firma)</p>
                </div>
            </div>
        </div>

        {loan.status === 'Devuelto' && loan.returnDate && (
             <div className="pt-8 text-center text-green-600">
                <p className="font-bold">** Material Devuelto el {format(new Date(loan.returnDate.replace(/-/g, '/')), "d 'de' MMMM, yyyy", { locale: es })} **</p>
            </div>
        )}
      </main>

      <footer className="mt-12 text-center text-xs text-gray-500">
        <p>Este es un comprobante de préstamo de material y debe ser firmado por ambas partes.</p>
        <p>H. Ayuntamiento de Escárcega.</p>
      </footer>
    </div>
  );
};


export default function PrintLoanReceiptPage() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrintControls, setShowPrintControls] = useState(false);
  const printTriggered = useRef(false);

  useEffect(() => {
    const handleAfterPrint = () => {
      setShowPrintControls(true);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    const loanDataString = sessionStorage.getItem('printableLoan');
    if (loanDataString && !printTriggered.current) {
      try {
        const loanData = JSON.parse(loanDataString);
        setLoan(loanData);
        setIsLoading(false);
        printTriggered.current = true;
        
        setTimeout(() => {
          window.print();
        }, 500); // Small delay to ensure content is rendered
      } catch (error) {
        console.error("Failed to parse loan data from session storage:", error);
        setIsLoading(false);
      }
    } else if (!loanDataString) {
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
        <p className="ml-2 text-gray-700">Cargando comprobante para impresión...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <X className="h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold text-gray-800">No se encontraron datos del préstamo</h1>
        <p className="mt-2 text-gray-600">
          Por favor, cierra esta pestaña y genera el comprobante de nuevo.
        </p>
      </div>
    );
  }

  return (
     <div className="bg-gray-100 min-h-screen">
      <header className="print-hide sticky top-0 bg-white shadow-md p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800">Vista de Impresión de Comprobante</h1>
          {showPrintControls && (
            <div className="flex items-center gap-2">
              <Button onClick={() => window.print()} size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir de nuevo
              </Button>
              <Button onClick={() => window.close()} size="sm" variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="py-8">
        <PrintLoanReceipt loan={loan} />
      </main>
    </div>
  );
}
