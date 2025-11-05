
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
  productId: string;
  productName: string;
  requester: string;
  loanDate: string;
  quantity: number;
  status: 'Prestado' | 'Devuelto';
};

export type User = {
    id: string;
    username: string;
    password?: string;
    name: string;
    role: 'admin' | 'user';
    permissions: string[];
};

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};
