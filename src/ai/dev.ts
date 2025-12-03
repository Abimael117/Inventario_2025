
'use client';
/**
 * @fileOverview This file is the entry point for Genkit's development server.
 *
 * It imports all the flow and tool definitions so that they can be discovered
 * and served by the Genkit development server.
 */

import { config } from 'dotenv';
config();

import '@/ai/flows/generate-stock-level-summary.ts';







