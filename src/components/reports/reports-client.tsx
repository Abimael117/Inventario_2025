
'use client';

import { useState, useTransition } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateInventoryReport } from '@/ai/flows/generate-inventory-report';
import type { Loan, Product } from '@/lib/types';

interface ReportsClientProps {
  products: Product[];
  loans: Loan[];
}

export default function ReportsClient({ products, loans }: ReportsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState('');
  const { toast } = useToast();

  const handleGenerateReport = () => {
    startTransition(async () => {
      try {
        const activeLoans = loans.filter(loan => loan.status === 'Prestado');
        const result = await generateInventoryReport({
          productsData: JSON.stringify(products),
          loansData: JSON.stringify(activeLoans),
        });
        setReport(result.report);
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

  return (
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
      <CardContent className="space-y-4">
        {report ? (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
              <p>{report.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setReport('')}>
              Generar Nuevo Reporte
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
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
