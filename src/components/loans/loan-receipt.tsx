
'use client';

import type { Loan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';

export function LoanReceipt({ loan }: { loan: Loan }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white text-black">
      <div id="receipt-to-print" className="p-8">
        <header className="flex justify-between items-center pb-4 border-b-4" style={{borderColor: '#C0A0A0'}}>
            <div className="flex items-center">
              <Image src="https://storage.googleapis.com/project-lk-chat-apps/7473787b-4024-4d1a-ac18-2d174d816f1b.png" alt="Escudo de Escárcega" width={100} height={100} data-ai-hint="logo government" />
            </div>
            <div className="text-center text-sm font-semibold">
              <p>HONORABLE AYUNTAMIENTO</p>
              <p>DE ESCÁRCEGA</p>
              <p>2024-2027</p>
            </div>
            <div className="flex items-center">
              <Image src="" alt="Logo Gobierno de Escárcega" width={120} height={80} data-ai-hint="logo city" />
            </div>
        </header>

        <main className="py-12">
            <h2 className="text-center text-xl font-bold mb-8">Comprobante de Préstamo de Material</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
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

            <div className="mt-24 grid grid-cols-2 gap-8 pt-12">
                <div className="text-center">
                    <div className="border-t border-gray-400 w-3/4 mx-auto"></div>
                    <p className="mt-2 text-sm">Entregado Por:</p>
                    <p className="text-xs text-gray-600">(Nombre y Firma)</p>
                </div>
                <div className="text-center">
                    <div className="border-t border-gray-400 w-3/4 mx-auto"></div>
                    <p className="mt-2 text-sm">Recibido Por:</p>
                    <p className="text-xs text-gray-600">(Nombre y Firma)</p>
                </div>
            </div>
        </main>
        
        <footer className="pt-4 mt-8">
            <Image src="" alt="Información del Ayuntamiento" width={800} height={80} layout="responsive" />
        </footer>
      </div>

      <div className="p-6 bg-gray-50 flex justify-end print:hidden">
        <Button onClick={handlePrint}>Imprimir Comprobante</Button>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-to-print, #receipt-to-print * {
            visibility: visible;
          }
          #receipt-to-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
