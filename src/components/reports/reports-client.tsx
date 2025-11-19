
'use client';

import { useState, useTransition, useMemo } from 'react';
import { Bot, Loader2, Package, AlertTriangle, ArrowRightLeft, FileText, Printer } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Loan, Product } from '@/lib/types';
import { generateLocalInventoryReport, type InventoryReport } from '@/lib/report-generator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportsClientProps {
  products: Product[];
  loans: Loan[];
  categories: string[];
}

const ReportViewer = ({ report, filters }: { report: InventoryReport, filters: { category: string, status: string } }) => {
  const { generalSummary, stockAlerts, inStock, activeLoans } = report;

  const hasFilters = filters.category || filters.status;
  const filterDescription = [filters.category, filters.status].filter(Boolean).join(" y ");

  const showStockAlerts = !filters.status || filters.status === "Agotado" || filters.status === "Stock Bajo";
  const showInStock = !filters.status || filters.status === "En Stock";


  return (
    <div className="space-y-6 bg-white text-black p-8 rounded-lg max-w-4xl mx-auto font-sans">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Reporte Ejecutivo de Inventario</h1>
        {hasFilters && <p className="text-sm text-gray-500 mt-1">Filtrado por: {filterDescription}</p>}
      </header>
      
      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2">Estado General del Inventario</h2>
        <p className="text-gray-600">{generalSummary}</p>
      </div>

      {showStockAlerts && (
        <div>
          <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><AlertTriangle className="text-red-500" />Alertas de Stock</h2>
          
          {(!filters.status || filters.status === "Agotado") && (
            <>
              <h3 className="text-lg font-semibold mt-4 mb-2">Nivel Crítico (Agotados)</h3>
              {stockAlerts.critical.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {stockAlerts.critical.map(item => (
                    <li key={item.name}><strong>{item.name}</strong>: <span className="font-bold text-red-600">{item.quantity} unidades</span></li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500 pl-5">No hay productos agotados.</p>}
            </>
          )}
          
          {(!filters.status || filters.status === "Stock Bajo") && (
            <>
              <h3 className="text-lg font-semibold mt-4 mb-2">Nivel Bajo (Requiere Reorden)</h3>
              {stockAlerts.low.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {stockAlerts.low.map(item => (
                    <li key={item.name}><strong>{item.name}</strong>: <span className="font-bold text-amber-600">{item.quantity} unidades</span></li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500 pl-5">No hay productos con stock bajo.</p>}
            </>
          )}
        </div>
      )}

      {showInStock && (
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
      )}


       <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><ArrowRightLeft />Préstamos Activos</h2>
         {activeLoans.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {activeLoans.map(item => (
              <li key={item.id}><strong>{item.name}</strong>: {item.quantity} unidad(es) a <span className="font-semibold">{item.requester}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500 pl-5">No hay préstamos activos en este momento.</p>}
      </div>
    </div>
  );
};


export default function ReportsClient({ products, loans, categories }: ReportsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<InventoryReport | null>(null);
  const { toast } = useToast();
  
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleGenerateReport = () => {
    startTransition(() => {
      
      const filteredProducts = products.filter(product => {
        const categoryMatch = categoryFilter ? product.category === categoryFilter : true;

        const getStatus = (p: Product) => {
            if (p.quantity === 0) return "Agotado";
            if (p.quantity > 0 && p.quantity <= p.reorderPoint) return "Stock Bajo";
            return "En Stock";
        };
        const statusMatch = statusFilter ? getStatus(product) === statusFilter : true;
        
        return categoryMatch && statusMatch;
      });
      
      if (filteredProducts.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No hay datos',
          description: 'No hay productos que coincidan con los filtros seleccionados para generar un reporte.',
        });
        return;
      }

      try {
        const productIdsInReport = new Set(filteredProducts.map(p => p.id));
        const activeLoansForReport = loans.filter(loan => loan.status === 'Prestado' && productIdsInReport.has(loan.productId));
        
        const reportFilters = {
          category: categoryFilter,
          status: statusFilter,
        };
        
        const result = generateLocalInventoryReport(filteredProducts, activeLoansForReport, reportFilters);
        setReport(result);
      } catch (error) {
        console.error("No se pudo generar el reporte local:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo generar el reporte. Por favor, inténtalo de nuevo.',
        });
      }
    });
  };

  const handlePrintReport = () => {
    if (report) {
      sessionStorage.setItem('printableReport', JSON.stringify(report));
      window.open('/print/report', '_blank');
    }
  };

  const handleCloseReport = () => {
    setReport(null);
  };

  const handleRegenerateReport = () => {
    setReport(null);
    handleGenerateReport();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle>Reporte de Inventario</CardTitle>
          </div>
          <CardDescription>
            Selecciona filtros opcionales para generar un análisis específico del estado de tu inventario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-4 leading-relaxed print-target">
                <ReportViewer report={report} filters={{ category: categoryFilter, status: statusFilter }} />
              </div>
              <div className="flex w-full justify-center items-center gap-4">
                <Button size="sm" variant="outline" onClick={handleCloseReport}>
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
                 <Button size="sm" variant="default" onClick={handlePrintReport}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Reporte
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
              
              <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
                 <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="En Stock">En Stock</SelectItem>
                      <SelectItem value="Stock Bajo">Stock Bajo</SelectItem>
                      <SelectItem value="Agotado">Agotado</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Haz clic para analizar los productos y generar un reporte ejecutivo.
                </p>
                <Button onClick={handleGenerateReport} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando y Generando...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Generar Reporte
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

    