
'use client';

import { useEffect, useState } from 'react';
import { Package, AlertTriangle, ArrowRightLeft, Loader2 } from 'lucide-react';
import type { InventoryReport } from '@/lib/report-generator';

// A simplified ReportViewer component, styled for printing.
const PrintReportViewer = ({ report }: { report: InventoryReport }) => {
  const { generalSummary, stockAlerts, inStock, activeLoans } = report;

  return (
    <div className="space-y-6 bg-white text-black p-8 rounded-lg max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-4">Reporte Ejecutivo de Inventario</h1>
      
      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2">Estado General del Inventario</h2>
        <p className="text-gray-600">{generalSummary}</p>
      </div>

      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><AlertTriangle className="text-red-500 h-5 w-5" />Alertas de Stock</h2>
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

      <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><Package className="h-5 w-5" />Productos en Existencia</h2>
        {inStock.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {inStock.map(item => (
              <li key={item.name}><strong>{item.name}</strong>: {item.quantity} unidades</li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500 pl-5">No hay productos con stock suficiente.</p>}
      </div>

       <div>
        <h2 className="text-xl font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" />Préstamos Activos</h2>
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


export default function PrintReportPage() {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const reportDataString = sessionStorage.getItem('printableReport');
    if (reportDataString) {
      try {
        const reportData = JSON.parse(reportDataString);
        setReport(reportData);
        setIsLoading(false);
        // Trigger print dialog after a short delay to allow content to render
        setTimeout(() => {
          window.print();
        }, 500);
      } catch (error) {
        console.error("Failed to parse report data from session storage:", error);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
        <p className="ml-2 text-gray-700">Cargando reporte para impresión...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-4 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">No se encontraron datos del reporte</h1>
        <p className="mt-2 text-gray-600">
          Por favor, cierra esta pestaña y genera el reporte de nuevo.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <PrintReportViewer report={report} />
    </div>
  );
}
