import { Schema } from "mongoose";

export interface CreateInvoiceDto {
  client_id: string;
  project_id?: string;
  amount: number;
  description?: string;
  invoiceDate?: Date;
  dueDate: Date;
}

export interface UpdateInvoiceDto {
  id?: string;
  invoice_id?: string;
  status?: 'Pending' | 'Paid' | 'Overdue';
  amount?: number;
  description?: string;
  dueDate?: Date;
  paymentDate?: Date;
}

export interface GetInvoiceDto {
  id?: string;
  invoice_id?: string;
}

export interface DeleteInvoiceDto {
  id?: string;
  invoice_id?: string;
}