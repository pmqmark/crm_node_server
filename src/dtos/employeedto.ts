import { Schema, Types } from "mongoose";


export interface CreateEmployeeDto {
    email: string;
    employee_id: string;
    firstName: string;
    lastName: string;
    password: string;
    phone: string;
    department_id?: Schema.Types.ObjectId;
    role_id?: Schema.Types.ObjectId;
  }

 export interface EmployeeUpdateFields {
      employee_id?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      department_id?: Types.ObjectId;
      role_id?: Types.ObjectId;
      email?: string;
      password?: string;
      hireDate?: Date;
    }