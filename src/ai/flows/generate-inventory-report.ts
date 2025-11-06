
'use server';
/**
 * @fileOverview Define un flujo de Genkit para generar un reporte narrativo del estado del inventario.
 *
 * - generateInventoryReport - Función asíncrona que genera el reporte.
 * - GenerateInventoryReportInput - El tipo de entrada para la función.
 * - GenerateInventoryReportOutput - El tipo de salida para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateInventoryReportInputSchema = z.object({
  productsData: z.string().describe('Cadena JSON con todos los datos de los productos, incluyendo nombre, cantidad, punto de reorden, etc.'),
  loansData: z.string().describe('Cadena JSON con los datos de los préstamos que están actualmente activos (estado "Prestado").'),
});
export type GenerateInventoryReportInput = z.infer<typeof GenerateInventoryReportInputSchema>;

const GenerateInventoryReportOutputSchema = z.object({
  report: z.string().describe('Un resumen narrativo y profesional en español del estado del inventario. Debe seguir una estructura de encabezados, identificar claramente los productos críticos y en préstamo, y finalizar con recomendaciones.'),
});
export type GenerateInventoryReportOutput = z.infer<typeof GenerateInventoryReportOutputSchema>;

export async function generateInventoryReport(input: GenerateInventoryReportInput): Promise<GenerateInventoryReportOutput> {
  return generateInventoryReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInventoryReportPrompt',
  input: { schema: GenerateInventoryReportInputSchema },
  output: { schema: GenerateInventoryReportOutputSchema },
  prompt: `Actúa como un analista de inventario experto para un sistema de gestión de un ayuntamiento. Tu tarea es generar un reporte ejecutivo profesional y bien estructurado en español, basado en los datos de productos y préstamos proporcionados.

El tono debe ser formal y directo, orientado a la toma de decisiones. Estructura el reporte utilizando los siguientes apartados con encabezados claros:

1.  **ESTADO GENERAL DEL INVENTARIO**:
    *   Comienza con un breve resumen del estado actual.

2.  **ALERTAS DE STOCK**:
    *   Identifica los productos que requieren atención inmediata.
    *   Crea una subsección "Nivel Crítico (Agotados)" para productos con cantidad 0.
    *   Crea una subsección "Nivel Bajo (Requiere Reorden)" para productos con cantidad menor or igual a su punto de reorden.
    *   Para cada producto, lista su nombre y la cantidad actual.
    *   Si no hay alertas, indícalo claramente.

3.  **PRÉSTAMOS ACTIVOS**:
    *   Lista todos los productos que se encuentran actualmente con el estado "Prestado".
    *   Para cada uno, especifica: Nombre del Producto, Cantidad Prestada y Solicitante.
    *   Si no hay préstamos activos, menciónalo explícitamente.

4.  **RECOMENDACIONES**:
    *   Basado en el análisis, proporciona un breve punto de acción, como "Se recomienda contactar a proveedores para reabastecer los productos en estado crítico y bajo" o "Realizar seguimiento de los préstamos activos".

No inventes información. Basa tu reporte únicamente en los datos proporcionados.

Datos de Productos: {{{productsData}}}
Datos de Préstamos Activos: {{{loansData}}}

Genera el reporte.`,
});

const generateInventoryReportFlow = ai.defineFlow(
  {
    name: 'generateInventoryReportFlow',
    inputSchema: GenerateInventoryReportInputSchema,
    outputSchema: GenerateInventoryReportOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    
    if (!output || !output.report) {
      throw new Error('La IA no pudo generar un reporte válido.');
    }
    
    return output;
  }
);
