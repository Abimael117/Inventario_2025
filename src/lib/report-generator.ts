
/**
 * @fileOverview Utility to generate an inventory report from local data,
 * replicating the structure of the previous AI-based report generator.
 */

import type { Product, Loan } from './types';

// The structure of the final report object.
export interface InventoryReport {
  generalSummary: string;
  stockAlerts: {
    critical: { name: string; quantity: number }[];
    low: { name: string; quantity: number }[];
  };
  inStock: { name: string; quantity: number }[];
  activeLoans: { id: string; name: string; quantity: number; requester: string }[];
}

interface ReportFilters {
    category?: string;
    status?: string;
}

/**
 * Generates an inventory report by processing product and loan data directly.
 * @param products - Array of product objects to be included in the report.
 * @param activeLoans - Array of all active loan objects relevant to the products.
 * @param filters - Optional filters applied to the report.
 * @returns An InventoryReport object.
 */
export function generateLocalInventoryReport(
  products: Product[],
  activeLoans: Loan[],
  filters: ReportFilters = {}
): InventoryReport {
  const critical: { name: string; quantity: number }[] = [];
  const low: { name: string; quantity: number }[] = [];
  const inStock: { name: string; quantity: number }[] = [];

  // 1. Classify products based on stock levels
  for (const product of products) {
    if (product.quantity === 0) {
      critical.push({ name: product.name, quantity: product.quantity });
    } else if (product.quantity > 0 && product.quantity <= product.reorderPoint) {
      low.push({ name: product.name, quantity: product.quantity });
    } else {
      inStock.push({ name: product.name, quantity: product.quantity });
    }
  }

  // 2. Format active loans
  const formattedLoans = activeLoans.map(loan => ({
    id: loan.id,
    name: loan.productName,
    quantity: loan.quantity,
    requester: loan.requester,
  }));
  
  // 3. Create a rule-based general summary
  let summaryIntro = 'El reporte';
  if (filters.category) {
    summaryIntro += ` para la categoría "${filters.category}"`;
  }
   if (filters.status) {
    const statusText = filters.category ? ` con estado "${filters.status}"` : ` con productos en estado "${filters.status}"`;
    summaryIntro += statusText;
  }
  
  let summary = `${summaryIntro} muestra un total de ${products.length} tipo(s) de producto(s) que coinciden con los criterios. `;
  
  if (critical.length > 0 || low.length > 0) {
    summary += `De estos, hay ${critical.length} producto(s) agotados y ${low.length} con stock bajo, requiriendo atención. `;
  } else {
    summary += "Dentro de la selección, los niveles de stock son saludables. ";
  }
  summary += `Actualmente, existen ${formattedLoans.length} préstamos activos para los productos en este reporte.`;

  // 4. Assemble and return the final report object
  return {
    generalSummary: summary,
    stockAlerts: {
      critical,
      low,
    },
    inStock,
    activeLoans: formattedLoans,
  };
}
