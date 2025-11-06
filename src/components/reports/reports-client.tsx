
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mt-2 mb-3 border-b pb-2">Estado General del Inventario</h2>
        <p className="text-muted-foreground">{generalSummary}</p>
      </div>

      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><AlertTriangle className="text-destructive" />Alertas de Stock</h2>
        <h3 className="text-lg font-semibold mt-4 mb-2">Nivel Crítico (Agotados)</h3>
        {stockAlerts.critical.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {stockAlerts.critical.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: <span className="font-bold text-destructive">{item.quantity} unidades</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground pl-5">No hay productos agotados.</p>}
        
        <h3 className="text-lg font-semibold mt-4 mb-2">Nivel Bajo (Requiere Reorden)</h3>
        {stockAlerts.low.length > 0 ? (
           <ul className="list-disc pl-5 space-y-1">
            {stockAlerts.low.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: <span className="font-bold text-amber-600">{item.quantity} unidades</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground pl-5">No hay productos con stock bajo.</p>}
      </div>
      
      {recentMovementsSummary && (
        <div>
            <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><MinusSquare />Movimientos y Ajustes Recientes</h2>
            <p className="text-muted-foreground">{recentMovementsSummary}</p>
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
        ) : <p className="text-sm text-muted-foreground pl-5">No hay productos con stock suficiente.</p>}
      </div>

       <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><ArrowRightLeft />Préstamos Activos</h2>
         {activeLoans.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {activeLoans.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: {item.quantity} unidad(es) a <Badge variant="secondary">{item.requester}</Badge></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground pl-5">No hay préstamos activos en este momento.</p>}
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
    <Card>
      <CardHeader className="print-hide">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <CardTitle>Reporte de Inventario con IA</CardTitle>
        </div>
        <CardDescription>
          Genera un análisis completo del estado actual de tu inventario, incluyendo alertas de stock bajo y préstamos activos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4 leading-relaxed report-printable-area">
              <ReportViewer report={report} />
            </div>
            <div className="flex items-center gap-4 print-hide">
              <Button variant="outline" size="sm" onClick={handleCloseReport}>
                Cerrar
              </Button>
               <Button size="sm" onClick={handleRegenerateReport} disabled={isPending}>
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
          <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center print-hide">
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
        )}
      </CardContent>
    </Card>
  );
}
