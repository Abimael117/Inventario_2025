'use client';

import * as React from 'react';
import { useState } from 'react';
import type { Loan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';

export function LoanReceipt({ loan }: { loan: Loan }) {
  const [entregadoPor, setEntregadoPor] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div 
        id="printable-receipt" 
        className="receipt-container bg-white text-black font-sans"
      >
        <header className="flex justify-between items-center pb-4 border-b-2" style={{ borderColor: '#C0A0A0' }}>
          <div className="flex items-center justify-start">
            <Image src="https://escarcega.gob.mx/escarcega.png" alt="Escudo de Escárcega" width={120} height={120} data-ai-hint="logo government" />
          </div>
          <div className="text-center text-sm font-semibold">
            <p>HONORABLE AYUNTAMIENTO</p>
            <p>DE ESCÁRCEGA</p>
            <p>2024-2027</p>
          </div>
          <div className="flex items-center justify-end">
            <Image src="https://tse1.mm.bing.net/th/id/OIP.W6OOgA_8g2-y3CIw54Uk6gHaEK?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3" alt="Logo Gobierno de Escárcega" width={150} height={84} data-ai-hint="logo city" />
          </div>
        </header>

        <main className="pt-12">
          <h2 className="text-center text-xl font-bold mb-12">Comprobante de Préstamo de Material</h2>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-32">
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

        <footer className="grid grid-cols-2 gap-8 pt-12">
            <div className="text-center">
              <div className="border-t border-gray-400 w-3/4 mx-auto mb-2">&nbsp;</div>
              <p className="text-sm font-semibold">Entregado por</p>
              <input
                type="text"
                placeholder="Nombre de quien entrega"
                className="w-3/4 mx-auto border-0 text-center text-xs focus:outline-none focus:ring-0 bg-transparent text-gray-500 print-input"
                value={entregadoPor}
                onChange={(e) => setEntregadoPor(e.target.value)}
              />
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 w-3/4 mx-auto mb-2">&nbsp;</div>
              <p className="text-sm font-semibold">Recibido por</p>
              <input
                type="text"
                placeholder="Nombre de quien recibe"
                className="w-3/4 mx-auto border-0 text-center text-xs focus:outline-none focus:ring-0 bg-transparent text-gray-500 print-input"
                value={recibidoPor}
                onChange={(e) => setRecibidoPor(e.target.value)}
              />
            </div>
          </footer>
      </div>

      <div className="p-6 bg-gray-50 flex justify-end print-hide">
        <Button onClick={handlePrint}>Imprimir Comprobante</Button>
      </div>
    </>
  );
}
