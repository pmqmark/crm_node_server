import { Schema } from "mongoose";


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