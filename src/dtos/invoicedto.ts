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


export interface detailCreateInvoiceDto {
  client_id: string;
  project_id?: string;
  items: Array<{
      service_name: string;
      service_type: 'hourly' | 'fixed' | 'subscription';
      hours?: number;
      rate_per_hour?: number;
      fixed_price?: number;
      quantity?: number;
      description?: string;
      service_period_start?: Date;
      service_period_end?: Date;
  }>;
  tax_rate?: number;
  description?: string;
  terms?: string;
  invoiceDate?: Date;
  dueDate: Date;
}

export interface detailUpdateInvoiceDto {
  id?: string;
  invoice_id?: string;
  items?: Array<{
      service_name: string;
      service_type: 'hourly' | 'fixed' | 'subscription';
      hours?: number;
      rate_per_hour?: number;
      fixed_price?: number;
      quantity?: number;
      description?: string;
      service_period_start?: Date;
      service_period_end?: Date;
  }>;
  tax_rate?: number;
  description?: string;
  terms?: string;
  dueDate?: Date;
  status?: 'Pending' | 'Paid' | 'Overdue';
  paymentDate?: Date;
}