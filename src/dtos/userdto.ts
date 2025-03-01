import { Schema, Types } from "mongoose";
export interface IUser extends Document {
    email: string;
    password: string;  // Moved to base interface
    role: "admin" | "employee";
    createdAt: Date;
    lastLogin: Date | null;
  }
  
  // Admin Interface
  export interface IAdmin extends IUser {
    admin_id: string;
    username: string;
  }
  
  // Employee Interface
  export interface IEmployee extends IUser {
    employee_id: string;
    firstName: string;
    lastName: string;
    phone: string;
    department_id: Types.ObjectId;
    role_id?: Types.ObjectId;
    hireDate: Date;
    permissions?: Types.ObjectId[];
  }
export interface CreateUserDto {
    role:string,
    email:string,
    password:string
}
export interface User {
    id: string;
    email: string;
    role: string | string[];
}
export interface loginUserDto {
    email:string,
    password:string
}
export interface validitatedUser {
    id:Types.ObjectId,
    role:string,
    email:string,
    accesstoken?:string,
    refreshtoken?:string
}

