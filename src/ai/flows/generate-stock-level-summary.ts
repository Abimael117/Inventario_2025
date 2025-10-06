// This file is machine-generated - edit with care!
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating summaries of stock levels using AI.
 *
 * - generateStockLevelSummary - An async function that generates the stock level summary.
 * - GenerateStockLevelSummaryInput - The input type for the generateStockLevelSummary function.
 * - GenerateStockLevelSummaryOutput - The output type for the generateStockLevelSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStockLevelSummaryInputSchema = z.object({
  inventoryData: z.string().describe('JSON string containing inventory data with product names, quantities, and locations.'),
  recentChangesLog: z.string().describe('JSON string containing recent inventory changes log with timestamps, product names, and quantity changes.'),
});
export type GenerateStockLevelSummaryInput = z.infer<typeof GenerateStockLevelSummaryInputSchema>;

const GenerateStockLevelSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of stock levels, identifying items at risk of stockout and anomalies in recent inventory changes.'),
});
export type GenerateStockLevelSummaryOutput = z.infer<typeof GenerateStockLevelSummaryOutputSchema>;

export async function generateStockLevelSummary(input: GenerateStockLevelSummaryInput): Promise<GenerateStockLevelSummaryOutput> {
  return generateStockLevelSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStockLevelSummaryPrompt',
  input: {schema: GenerateStockLevelSummaryInputSchema},
  output: {schema: GenerateStockLevelSummaryOutputSchema},
  prompt: `You are an AI assistant that analyzes inventory data and provides summaries.

You will receive inventory data and a log of recent changes. Your task is to identify items that are at risk of stockout and to discover any anomalies in the recent inventory changes.

Inventory Data: {{{inventoryData}}}
Recent Changes Log: {{{recentChangesLog}}}

Summary:`,
});

const generateStockLevelSummaryFlow = ai.defineFlow(
  {
    name: 'generateStockLevelSummaryFlow',
    inputSchema: GenerateStockLevelSummaryInputSchema,
    outputSchema: GenerateStockLevelSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
