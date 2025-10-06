import type { Product, StockLog, Loan } from '@/lib/types';

export const products: Product[] = [
  { id: 'PROD001', name: 'Blue Widgets', sku: 'BW-001', category: 'Widgets', quantity: 15, location: 'Warehouse A, Shelf 3', reorderPoint: 10 },
  { id: 'PROD002', name: 'Red Gadgets', sku: 'RG-002', category: 'Gadgets', quantity: 8, location: 'Warehouse B, Bin 12', reorderPoint: 15 },
  { id: 'PROD003', name: 'Green Gizmos', sku: 'GG-003', category: 'Gizmos', quantity: 50, location: 'Warehouse A, Shelf 1', reorderPoint: 20 },
  { id: 'PROD004', name: 'Yellow Sprockets', sku: 'YS-004', category: 'Sprockets', quantity: 120, location: 'Warehouse C, Aisle 5', reorderPoint: 100 },
  { id: 'PROD005', name: 'Purple Doohickeys', sku: 'PD-005', category: 'Doohickeys', quantity: 3, location: 'Retail Floor, Display 2', reorderPoint: 5 },
  { id: 'PROD006', name: 'Orange Thingamajigs', sku: 'OT-006', category: 'Thingamajigs', quantity: 75, location: 'Warehouse B, Shelf 8', reorderPoint: 50 },
  { id: 'PROD007', name: 'Black Whatchamacallits', sku: 'BW-007', category: 'Whatchamacallits', quantity: 22, location: 'Warehouse A, Bin 4', reorderPoint: 20 },
];

export const stockLogs: StockLog[] = [
  { id: 'LOG001', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), productName: 'Red Gadgets', quantityChange: -5, reason: 'Venta' },
  { id: 'LOG002', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), productName: 'Blue Widgets', quantityChange: -10, reason: 'Venta' },
  { id: 'LOG003', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), productName: 'Purple Doohickeys', quantityChange: 20, reason: 'Reabastecimiento' },
  { id: 'LOG004', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), productName: 'Green Gizmos', quantityChange: -2, reason: 'Daño' },
  { id: 'LOG005', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), productName: 'Red Gadgets', quantityChange: 50, reason: 'Reabastecimiento' },
  { id: 'LOG006', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), productName: 'Yellow Sprockets', quantityChange: -30, reason: 'Venta' },
  { id: 'LOG007', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), productName: 'Purple Doohickeys', quantityChange: -1, reason: 'Ajuste' },
];

export const loans: Loan[] = [
    { id: 'LOAN001', productName: 'Red Gadgets', requester: 'Equipo de Marketing', loanDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'Prestado' },
    { id: 'LOAN002', productName: 'Blue Widgets', requester: 'Juan Pérez (Ventas)', loanDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'Devuelto' },
    { id: 'LOAN003', productName: 'Yellow Sprockets', requester: 'I+D', loanDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: 'Prestado' },
];
