
export type Product = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  location: string;
  reorderPoint: number;
};

export type Loan = {
  id: string;
  productId: string;
  productName: string;
  requester: string;
  loanDate: string; // ISO 8601 or YYYY-MM-DD
  returnDate?: string; // ISO 8601 or YYYY-MM-DD
  quantity: number;
  status: 'Prestado' | 'Devuelto';
};

export type StockMovement = {
    id: string;
    productId: string;
    productName:string;
    quantity: number;
    type: 'ajuste';
    reason: string;
    date: string; // ISO 8601 format
};

export type User = {
    uid: string; // Firebase Auth UID is the document ID
    username: string; 
    password?: string; // Only used for creation/update, not stored in Firestore
    name: string;
    role: 'admin' | 'user';
    permissions: string[];
};

export type Notification = {
    id: string;
    type: 'ajuste';
    title: string;
    description: string;
    createdAt: string; // ISO 8601 format
    isRead: boolean;
};
