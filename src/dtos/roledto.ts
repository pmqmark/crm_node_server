import { Schema } from "mongoose";

export interface IRole extends Document {
    name: string;
    description: string;
    permissions?: string[];
     // Optional - can be null for global roles
  }