'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import type { Loan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';

// 1. El contenido a imprimir se define en un componente separado que usa forwardRef.
const PrintableContent = React.forwardRef<HTMLDivElement, { loan: Loan; entregadoPor: string; recibidoPor: string; }>((props, ref) => {
    const { loan, entregadoPor, recibidoPor } = props;
  
    return (
        <div ref={ref} className="bg-white text-black p-8">
            <header className="flex justify-between items-center pb-4 border-b-4" style={{borderColor: '#C0A0A0'}}>
                <div className="flex items-center justify-start w-1/3">
                <Image src="https://escarcega.gob.mx/escarcega.png" alt="Escudo de Escárcega" width={350} height={238} data-ai-hint="logo government" style={{ height: '150px', width: 'auto' }} />
                </div>
                <div className="text-center text-sm font-semibold w-1/3">
                <p>HONORABLE AYUNTAMIENTO</p>
                <p>DE ESCÁRCEGA</p>
                <p>2024-2027</p>
                </div>
                <div className="flex items-center justify-end w-1/3">
                <Image src="https://tse1.mm.bing.net/th/id/OIP.W6OOgA_8g2-y3CIw54Uk6gHaEK?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3" alt="Logo Gobierno de Escárcega" width={350} height={238} data-ai-hint="logo city" style={{ height: '150px', width: 'auto' }} />
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
                        <div className="border-b border-gray-400 w-3/4 mx-auto">&nbsp;</div>
                        <p className="mt-2 text-sm font-semibold">Entregado por</p>
                         <input
                        type="text"
                        placeholder="Nombre de quien entrega"
                        className="w-3/4 mx-auto border-0 text-center text-sm focus:outline-none focus:ring-0 bg-transparent text-gray-500"
                        value={entregadoPor}
                        readOnly
                        />
                    </div>
                    <div className="text-center">
                        <div className="border-b border-gray-400 w-3/4 mx-auto">&nbsp;</div>
                        <p className="mt-2 text-sm font-semibold">Recibido por</p>                         <input
                        type="text"
                        placeholder="Nombre de quien recibe"
                        className="w-3/4 mx-auto border-0 text-center text-sm focus:outline-none focus:ring-0 bg-transparent text-gray-500"
                        value={recibidoPor}
                        readOnly
                        />
                    </div>
                </div>
            </main>
            
            <footer className="pt-4 mt-8">
            </footer>
        </div>
    );
});
PrintableContent.displayName = 'PrintableContent';


export function LoanReceipt({ loan }: { loan: Loan }) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [entregadoPor, setEntregadoPor] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');

  // 2. El hook 'useReactToPrint' devuelve una función para manejar la impresión.
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `comprobante-${loan.productName.replace(/ /g, '_')}`,
  });

  return (
    <div>
        {/* 3. El componente a imprimir se renderiza aquí, pero oculto. */}
        <div style={{ display: 'none' }}>
            <PrintableContent ref={componentRef} loan={loan} entregadoPor={entregadoPor} recibidoPor={recibidoPor} />
        </div>

        {/* El resto de tu componente se mantiene exactamente igual */}
        <div className="bg-white text-black p-8">
            <header className="flex justify-between items-center pb-4 border-b-4" style={{borderColor: '#C0A0A0'}}>
                <div className="flex items-center justify-start w-1/3">
                <Image src="https://escarcega.gob.mx/escarcega.png" alt="Escudo de Escárcega" width={350} height={238} data-ai-hint="logo government" style={{ height: '150px', width: 'auto' }} />
                </div>
                <div className="text-center text-sm font-semibold w-1/3">
                <p>HONORABLE AYUNTAMIENTO</p>
                <p>DE ESCÁRCEGA</p>
                <p>2024-2027</p>
                </div>
                <div className="flex items-center justify-end w-1/3">
                <Image src="https://tse1.mm.bing.net/th/id/OIP.W6OOgA_8g2-y3CIw54Uk6gHaEK?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3" alt="Logo Gobierno de Escárcega" width={350} height={238} data-ai-hint="logo city" style={{ height: '150px', width: 'auto' }} />
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
                        <div className="border-b border-gray-400 w-3/4 mx-auto">&nbsp;</div>
                        <p className="mt-2 text-sm font-semibold">Entregado por</p>
                         <input
                        type="text"
                        placeholder="Nombre de quien entrega"
                        className="w-3/4 mx-auto border-0 text-center text-sm focus:outline-none focus:ring-0 bg-transparent text-gray-500"
                        value={entregadoPor}
                        onChange={(e) => setEntregadoPor(e.target.value)}
                        />
                    </div>
                    <div className="text-center">
                        <div className="border-b border-gray-400 w-3/4 mx-auto">&nbsp;</div>
                        <p className="mt-2 text-sm font-semibold">Recibido por</p>
                         <input
                        type="text"
                        placeholder="Nombre de quien recibe"
                        className="w-3/4 mx-auto border-0 text-center text-sm focus:outline-none focus:ring-0 bg-transparent text-gray-500"
                        value={recibidoPor}
                        onChange={(e) => setRecibidoPor(e.target.value)}
                        />
                    </div>
                </div>
            </main>
            
            <footer className="pt-4 mt-8">
            </footer>
        </div>

        {/* 4. El botón visible ahora solo llama a handlePrint en su onClick. */}
        <div className="p-6 bg-gray-50 flex justify-end">
            <Button onClick={handlePrint}>Imprimir Comprobante</Button>
        </div>
    </div>
  );
}
