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

// Simple Markdown to HTML parser
const MarkdownViewer = ({ content }: { content: string }) => {
  const lines = content.split('\n');

  return (
    <div>
      {lines.map((line, index) => {
        line = line.trim();

        if (line.startsWith('#### ')) {
          return <h4 key={index} className="text-md font-semibold mt-4 mb-2">{line.substring(5)}</h4>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-6 mb-3 border-b pb-2">{line.substring(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-8 mb-4">{line.substring(3)}</h2>;
        }
        if (line.startsWith('*')) {
            const boldedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').substring(1).trim();
            return <p key={index} className="pl-4" dangerouslySetInnerHTML={{ __html: `&bull; ${boldedLine}` }} />;
        }
        if (line.match(/^\d+\./)) {
             const boldedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
             return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: boldedLine }} />;
        }


        // Replace **word** with <strong>word</strong>
        const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
      })}
    </div>
  );
};


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
              <MarkdownViewer content={report} />
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
