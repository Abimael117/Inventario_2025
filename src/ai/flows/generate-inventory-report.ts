
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
  report: z.string().describe('Un resumen narrativo y profesional en español del estado del inventario. Debe seguir una estructura de encabezados e identificar claramente los productos críticos y en préstamo.'),
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

**IMPORTANTE: El formato de salida es CRÍTICO. Debes seguir exactamente el siguiente formato Markdown, usando '##' para los títulos principales, '###' para subtítulos, y '**' para texto en negrita.**

### EJEMPLO DE FORMATO:
## ESTADO GENERAL DEL INVENTARIO
Texto del resumen general.

## ALERTAS DE STOCK
### Nivel Crítico (Agotados)
* **Nombre del Producto**: Cantidad actual
### Nivel Bajo (Requiere Reorden)
* **Nombre del Producto**: Cantidad actual

## PRODUCTOS EN EXISTENCIA
* **Nombre del Producto**: Cantidad actual

## PRÉSTAMOS ACTIVOS
* **Nombre del Producto**: Cantidad Prestada, Solicitante: **Nombre del Solicitante**

---

Ahora, usa los siguientes datos para generar el reporte real, siguiendo estrictamente el formato del ejemplo anterior. No inventes información y no incluyas una sección de recomendaciones.

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
