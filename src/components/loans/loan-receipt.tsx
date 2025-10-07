'use client';

import * as React from 'react';
import type { Loan } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';

export function LoanReceipt({ loan }: { loan: Loan }) {
  
  return (
    <div 
      id="printable-receipt" 
      className="receipt-container font-sans text-foreground"
    >
      <header className="grid grid-cols-3 items-center pb-4 border-b border-gray-400">
        <div className="flex justify-start">
          <Image src="https://escarcega.gob.mx/escarcega.png" alt="Escudo de Escárcega" width={100} height={100} data-ai-hint="logo government" />
        </div>
        <div className="text-center text-sm font-semibold">
          <p>HONORABLE AYUNTAMIENTO</p>
          <p>DE ESCÁRCEGA</p>
          <p>2024-2027</p>
        </div>
        <div className="flex justify-end">
          <Image src="https://tse1.mm.bing.net/th/id/OIP.W6OOgA_8g2-y3CIw54Uk6gHaEK?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3" alt="Logo Gobierno de Escárcega" width={120} height={68} data-ai-hint="logo city" />
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
            <p className="font-bold">Solicitado Por:</p>
            <p>{loan.requester}</p>
          </div>
          <div>
            <p className="font-bold">Fecha de Salida:</p>
            <p>{format(new Date(loan.loanDate), "d 'de' MMMM, yyyy", { locale: es })}</p>
          </div>
        </div>
      </main>

      <footer className="grid grid-cols-2 gap-8 pt-16">
        <div className="text-center">
          <div className="border-t border-gray-400 w-3/4 mx-auto mb-2">&nbsp;</div>
          <p className="text-sm font-semibold">Entregado por</p>
          <p className="text-xs text-gray-500 mt-1">Nombre de quien entrega</p>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 w-3/4 mx-auto mb-2">&nbsp;</div>
          <p className="text-sm font-semibold">Recibido por</p>
          <p className="text-xs text-gray-500 mt-1">Nombre de quien recibe</p>
        </div>
      </footer>
    </div>
  );
}
