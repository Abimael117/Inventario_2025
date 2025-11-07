
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
  movementsData: z.string().describe('Cadena JSON con los datos de los movimientos o ajustes de stock más recientes.'),
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
  recentMovementsSummary: z.string().describe('Un breve resumen (1-2 frases) de los movimientos y ajustes de stock más significativos o recientes, explicando la razón del último movimiento.'),
});
export type GenerateInventoryReportOutput = z.infer<typeof GenerateInventoryReportOutputSchema>;

export async function generateInventoryReport(input: GenerateInventoryReportInput): Promise<GenerateInventoryReportOutput> {
  return generateInventoryReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInventoryReportPrompt',
  input: { schema: GenerateInventoryReportInputSchema },
  output: { schema: GenerateInventoryReportOutputSchema },
  prompt: `Actúa como un analista de inventario experto para un sistema de gestión de un ayuntamiento. Tu tarea es analizar los datos de productos, préstamos y movimientos proporcionados y estructurarlos en el formato JSON de salida requerido.

Analiza los siguientes datos y rellena los campos del schema de salida:

- **generalSummary**: Escribe un resumen profesional de 2 o 3 frases sobre el estado general. Este campo es obligatorio.
- **stockAlerts.critical**: Identifica los productos con cantidad CERO.
- **stockAlerts.low**: Identifica productos donde la cantidad es > 0 pero <= reorderPoint.
- **inStock**: Lista los productos donde la cantidad es > reorderPoint.
- **activeLoans**: Lista los productos de los préstamos activos.
- **recentMovementsSummary**: Analiza los movimientos de stock recientes. Enfócate en el último movimiento registrado. Describe la razón de ese ajuste en 1 o 2 frases. Si no hay movimientos, déjalo vacío.

**Importante sobre las fechas**: Al analizar las fechas de los movimientos (campo 'date'), ignora siempre la parte de la hora y la zona horaria. Considera solo el día, mes y año para evitar errores de un día.

No inventes información. Si una categoría no tiene productos (ej. no hay productos en nivel crítico), devuelve un array vacío o una cadena vacía.

Datos de Productos: {{{productsData}}}
Datos de Préstamos Activos: {{{loansData}}}
Datos de Movimientos Recientes: {{{movementsData}}}
`,
});

const generateInventoryReportFlow = ai.defineFlow(
  {
    name: 'generateInventoryReportFlow',
    inputSchema: GenerateInventoryReportInputSchema,
    outputSchema: GenerateInventoryReportOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error('La IA no pudo generar un reporte válido.');
    }
    
    return output;
  }
);
