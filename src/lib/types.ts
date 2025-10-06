export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  location: string;
  reorderPoint: number;
};

export type StockLog = {
  id: string;
  timestamp: string;
  productName: string;
  quantityChange: number;
  reason: 'Venta' | 'Reabastecimiento' | 'Ajuste' | 'Daño';
};

export type Loan = {
  id: string;
  productName: string;
  requester: string;
  loanDate: string;
  status: 'Prestado' | 'Devuelto';
};
