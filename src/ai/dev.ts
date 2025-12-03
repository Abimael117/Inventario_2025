
'use client';
/**
 * @fileOverview This file is the entry point for Genkit's development server.
 *
 * It imports all the flow and tool definitions so that they can be discovered
 * and served by the Genkit development server.
 */

import { config } from 'dotenv';
config();

// DO NOT import any flows here that might have server-side dependencies
// that could be pulled into the client-side bundle during Next.js compilation.
// This was the source of the "Module not found: Can't resolve 'fs'" error.
