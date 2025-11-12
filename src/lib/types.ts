

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
  loanDate: string;
  returnDate?: string;
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
    date: string;
};

export type User = {
    uid: string; // Firebase Auth UID is the document ID
    username: string; 
    password?: string; // Only used for creation/update, not stored in Firestore
    name: string;
    role: 'admin' | 'user';
    permissions: string[];
    gender?: 'male' | 'female' | 'other';
};

