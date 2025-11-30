export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: PaymentStatus;
  receiptBase64?: string; // Optional base64 string of the uploaded receipt
  createdAt: number;
}

export interface ExpenseDraft {
  description: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  receiptBase64?: string;
}
