
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
  generalSummary: z.string().min(1, "El resumen general no puede estar vacío.").describe('Un breve resumen ejecutivo (2-3 frases) del estado general del inventario.'),
  stockAlerts: z.object({
    critical: z.array(z.object({ name: z.string(), quantity: z.number() })).describe('Lista de productos con cantidad CERO (agotados).'),
    low: z.array(z.object({ name: z.string(), quantity: z.number() })).describe('Lista de productos cuya cantidad es mayor que cero pero menor o igual a su punto de reorden.'),
  }),
  inStock: z.array(z.object({ name: z.string(), quantity: z.number() })).describe('Lista de productos con buena cantidad de stock (cantidad mayor al punto de reorden).'),
  activeLoans: z.array(z.object({ name: z.string(), quantity: z.number(), requester: z.string() })).describe('Lista de productos que están actualmente en préstamo.'),
});
export type GenerateInventoryReportOutput = z.infer<typeof GenerateInventoryReportOutputSchema>;

export async function generateInventoryReport(input: GenerateInventoryReportInput): Promise<GenerateInventoryReportOutput> {
  return generateInventoryReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInventoryReportPrompt',
  input: { schema: GenerateInventoryReportInputSchema },
  output: { schema: GenerateInventoryReportOutputSchema },
  prompt: `Eres un analista de inventario experto para la Dirección de Educación, Cultura y Deporte.
Tu tarea es analizar los datos de inventario y préstamos para generar un reporte ejecutivo claro y conciso.

**Instrucciones:**
1.  **Resumen General:** Proporciona un resumen de 2-3 frases sobre el estado general del inventario. Menciona si la situación es saludable o si hay problemas críticos.
2.  **Alertas de Stock:**
    - Identifica productos **críticos** (cantidad = 0) y ponlos en la lista 'critical'.
    - Identifica productos con **stock bajo** (cantidad > 0 y <= punto de reorden) y ponlos en la lista 'low'.
3.  **Productos en Existencia:** Lista los productos que tienen un nivel de stock saludable (cantidad > punto de reorden).
4.  **Préstamos Activos:** Lista todos los productos que están actualmente en estado "Prestado".

**Datos de Entrada:**
- Inventario de Productos: {{{productsData}}}
- Préstamos Activos: {{{loansData}}}

Genera la respuesta estrictamente en el formato JSON de salida solicitado.`,
});

const generateInventoryReportFlow = ai.defineFlow(
  {
    name: 'generateInventoryReportFlow',
    inputSchema: GenerateInventoryReportInputSchema,
    outputSchema: GenerateInventoryReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
