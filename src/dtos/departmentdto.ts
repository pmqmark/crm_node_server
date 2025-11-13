import { Schema, Types } from "mongoose";

//extends Document Makes your interface represent a full Mongoose document, not just plain data
export interface IDepartment extends Document {
  id?: string;
  name: string;
  description: string;
  manager_id?: Types.ObjectId;
  created_at: Date;
}
