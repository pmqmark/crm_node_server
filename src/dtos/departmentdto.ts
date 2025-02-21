import { Schema, Types } from "mongoose";

export interface IDepartment extends Document {
    id?:string;
    name: string;
    description: string;
    manager_id?: Types.ObjectId;
    created_at: Date;
    permissions?: string[];
  }