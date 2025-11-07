
'use client';

import * as React from 'react';
import type { Loan } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type LoanReceiptProps = {
  loan: Loan;
  entregadoPor: string;
  recibidoPor: string;
  setEntregadoPor: (value: string) => void;
  setRecibidoPor: (value: string) => void;
};

export function LoanReceipt({
  loan,
  entregadoPor,
  recibidoPor,
  setEntregadoPor,
  setRecibidoPor,
}: LoanReceiptProps) {
    const [year, month, day] = loan.loanDate.split('-').map(Number);
    // Using UTC to prevent timezone shifts. Month is 0-indexed.
    const loanDateObject = new Date(Date.UTC(year, month - 1, day));
    const formattedDate = format(loanDateObject, "d 'de' MMMM, yyyy", { locale: es });


  return (
    <div className={cn('font-sans text-foreground bg-white p-10')}>
      <header className="grid grid-cols-3 items-center pb-4 border-b border-gray-400">
        <div className="flex justify-start">
          <Image
            src="https://escarcega.gob.mx/escarcega.png"
            alt="Escudo de Escárcega"
            width={100}
            height={100}
            data-ai-hint="logo government"
          />
        </div>
        <div className="text-center text-sm font-semibold">
          <p>HONORABLE AYUNTAMIENTO</p>
          <p>DE ESCÁRCEGA</p>
          <p>2024-2027</p>
        </div>
        <div className="flex justify-end">
          <Image
            src="https://tse1.mm.bing.net/th/id/OIP.W6OOgA_8g2-y3CIw54Uk6gHaEK?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3"
            alt="Logo Gobierno de Escárcega"
            width={120}
            height={68}
            data-ai-hint="logo city"
          />
        </div>
      </header>

      <main className="pt-10">
        <h2 className="text-center text-lg font-bold mb-10">Comprobante de Préstamo de Material</h2>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm mb-24">
          <div>
            <p className="font-bold">Producto Prestado:</p>
            <p>{loan.productName}</p>
          </div>
           <div>
            <p className="font-bold">Cantidad Prestada:</p>
            <p>{loan.quantity} unidad(es)</p>
          </div>
          <div>
            <p className="font-bold">Solicitado Por:</p>
            <p>{loan.requester}</p>
          </div>
          <div>
            <p className="font-bold">Fecha de Salida:</p>
            <p>{formattedDate}</p>
          </div>
        </div>
      </main>

      <footer className="grid grid-cols-2 gap-8 pt-16">
        <div className="text-center">
          <div className="border-t border-gray-400 w-3/4 mx-auto mb-2">&nbsp;</div>
          <p className="text-sm font-semibold">Entregado por</p>
          <div className="mt-1">
            <Input
              placeholder="Nombre de quien entrega"
              className="border-0 border-b border-gray-300 rounded-none bg-transparent text-center shadow-none focus-visible:ring-0 px-1"
              value={entregadoPor}
              onChange={(e) => setEntregadoPor(e.target.value)}
            />
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 w-3/4 mx-auto mb-2">&nbsp;</div>
          <p className="text-sm font-semibold">Recibido por</p>
          <div className="mt-1">
            <Input
              placeholder="Nombre de quien recibe"
              className="border-0 border-b border-gray-300 rounded-none bg-transparent text-center shadow-none focus-visible:ring-0 px-1"
              value={recibidoPor}
              onChange={(e) => setRecibidoPor(e.target.value)}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}

    