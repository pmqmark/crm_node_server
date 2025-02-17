import mongoose, { Schema } from "mongoose";
import { IRole } from "../dtos/roledto";

const roleSchema = new Schema<IRole>({
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    permissions: [{
      type: String,
      required: true
    }],
    department_id: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: false 
    }
  });
  
 
roleSchema.index({ name: 1, department_id: 1 }, { unique: true });

const Role = mongoose.model<IRole>('Role', roleSchema);
export default Role;