import { Schema } from "mongoose";

export interface IRole extends Document {
    name: string;
    description: string;
    permissions: string[];
    department_id?: Schema.Types.ObjectId; // Optional - can be null for global roles
  }