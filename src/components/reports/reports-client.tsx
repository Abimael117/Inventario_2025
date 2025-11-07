
'use client';

import { useState, useTransition } from 'react';
import { Bot, Loader2, Package, AlertTriangle, ArrowRightLeft, FileText, Printer, MinusSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateInventoryReport, type GenerateInventoryReportOutput } from '@/ai/flows/generate-inventory-report';
import type { Loan, Product, StockMovement } from '@/lib/types';
import { Badge } from '../ui/badge';

interface ReportsClientProps {
  products: Product[];
  loans: Loan[];
  movements: StockMovement[];
}

const ReportViewer = ({ report }: { report: GenerateInventoryReportOutput }) => {
  const { generalSummary, stockAlerts, inStock, activeLoans, recentMovementsSummary } = report;

  return (
    <div className="space-y-6 bg-white text-black p-8 rounded-lg max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-4">Reporte Ejecutivo de Inventario</h1>
      
      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2">Estado General del Inventario</h2>
        <p className="text-gray-600">{generalSummary}</p>
      </div>

      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><AlertTriangle className="text-red-500" />Alertas de Stock</h2>
        <h3 className="text-lg font-semibold mt-4 mb-2">Nivel Crítico (Agotados)</h3>
        {stockAlerts.critical.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {stockAlerts.critical.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: <span className="font-bold text-red-600">{item.quantity} unidades</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500 pl-5">No hay productos agotados.</p>}
        
        <h3 className="text-lg font-semibold mt-4 mb-2">Nivel Bajo (Requiere Reorden)</h3>
        {stockAlerts.low.length > 0 ? (
           <ul className="list-disc pl-5 space-y-1">
            {stockAlerts.low.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: <span className="font-bold text-amber-600">{item.quantity} unidades</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500 pl-5">No hay productos con stock bajo.</p>}
      </div>
      
      {recentMovementsSummary && (
        <div>
            <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><MinusSquare />Movimientos y Ajustes Recientes</h2>
            <p className="text-gray-600">{recentMovementsSummary}</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><Package />Productos en Existencia</h2>
        {inStock.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {inStock.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: {item.quantity} unidades</li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500 pl-5">No hay productos con stock suficiente.</p>}
      </div>

       <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><ArrowRightLeft />Préstamos Activos</h2>
         {activeLoans.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {activeLoans.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: {item.quantity} unidad(es) a <span className="font-semibold">{item.requester}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500 pl-5">No hay préstamos activos en este momento.</p>}
      </div>
    </div>
  );
};


export default function ReportsClient({ products, loans, movements }: ReportsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<GenerateInventoryReportOutput | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = () => {
    startTransition(async () => {
      if (products.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No hay datos',
          description: 'No se pueden generar reportes si no hay productos en el inventario.',
        });
        return;
      }

      try {
        const activeLoans = loans.filter(loan => loan.status === 'Prestado');
        const result = await generateInventoryReport({
          productsData: JSON.stringify(products),
          loansData: JSON.stringify(activeLoans),
          movementsData: JSON.stringify(movements),
        });
        setReport(result);
      } catch (error) {
        console.error("No se pudo generar el reporte:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo generar el reporte de IA. Por favor, inténtalo de nuevo.',
        });
      }
    });
  };

  const handleCloseReport = () => {
    setReport(null);
  };

  const handleRegenerateReport = () => {
    setReport(null);
    handleGenerateReport();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle>Reporte de Inventario con IA</CardTitle>
          </div>
          <CardDescription>
            Genera un análisis completo del estado actual de tu inventario, incluyendo alertas de stock bajo y préstamos activos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="space-y-4">
              {/* Este div es para la VISTA PREVIA en pantalla */}
              <div className="rounded-md border bg-muted/30 p-4 leading-relaxed">
                <ReportViewer report={report} />
              </div>
              <div className="flex w-full justify-center items-center gap-4">
                <Button size="sm" variant="outline" onClick={handleCloseReport}>
                  Cerrar
                </Button>
                <Button size="sm" variant="outline" onClick={handleRegenerateReport} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    'Volver a Generar'
                  )}
                </Button>
                <Button size="sm" onClick={handlePrint} variant="default">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Reporte
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Haz clic en el botón para que la IA analice todos los productos y préstamos, y genere un reporte ejecutivo.
                </p>
                <Button onClick={handleGenerateReport} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando y Generando...
                    </>
                  ) : (
                    'Generar Reporte de Inventario'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Contenedor solo para impresión, oculto en la pantalla */}
      <div className="printable-content">
          {report && <ReportViewer report={report} />}
      </div>
    </>
  );
}
