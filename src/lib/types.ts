

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

export type StockMovement = {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    type: 'descuento' | 'incremento';
    reason: string;
    date: string;
};

export type User = {
    id: string; // This will be the Firebase Auth UID
    uid: string; // Explicitly keep uid as it's used in Firestore doc
    username: string; // This will be the email
    password?: string; // Only used for creation, not stored in Firestore
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

    