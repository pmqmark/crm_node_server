import { Schema, Types } from "mongoose";

export interface CreateEmployeeDto {
  email: string;
  employee_id?: string;
  firstName: string;
  lastName: string;
  password: string;
  phone: string;
  department_id?: Schema.Types.ObjectId;
  role_id?: Schema.Types.ObjectId;
  hireDate: Date;
  dob: Date;
  addressline1: string;
  addressline2: string;
  city: string;
  state: string;
  country: string;
  postalcode: string;
  employeebio: string;
}

export interface EmployeeUpdateFields {
  [key: string]: any;
  employee_id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department_id?: Types.ObjectId;
  role_id?: Types.ObjectId;
  hireDate?: Date;
  dob?: Date;
  addressline1?: string;
  addressline2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalcode?: string;
  employeebio?: string;
}