
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
  report: z.string().describe('Un resumen narrativo en español del estado del inventario. Debe identificar claramente los productos con stock bajo (cantidad <= punto de reorden), los productos agotados (cantidad = 0), y listar los productos que se encuentran actualmente en préstamo, mencionando quién lo solicitó.'),
});
export type GenerateInventoryReportOutput = z.infer<typeof GenerateInventoryReportOutputSchema>;

export async function generateInventoryReport(input: GenerateInventoryReportInput): Promise<GenerateInventoryReportOutput> {
  return generateInventoryReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInventoryReportPrompt',
  input: { schema: GenerateInventoryReportInputSchema },
  output: { schema: GenerateInventoryReportOutputSchema },
  prompt: `Eres un asistente de gestión de inventario. Tu tarea es analizar los datos de productos y préstamos para generar un reporte ejecutivo en español.

El reporte debe ser claro, conciso y accionable.

Primero, analiza los datos de los productos. Identifica y lista los productos cuyo stock es bajo o crítico (cantidad actual es menor o igual al punto de reorden). Separa claramente los que tienen stock bajo de los que están completamente agotados (cantidad igual a 0).

Segundo, analiza los datos de los préstamos activos. Lista cada producto que está actualmente prestado, la cantidad prestada y quién lo solicitó.

Finalmente, estructura el reporte en un solo texto coherente. Si no hay alertas de stock o préstamos activos, indícalo claramente. No inventes información.

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

