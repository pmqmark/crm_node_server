import mongoose, { Schema, Document } from 'mongoose';
import {IDepartment} from "../dtos/departmentdto"

const departmentSchema = new Schema<IDepartment>({
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    manager_id: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  });

const Department = mongoose.model<IDepartment>('Department', departmentSchema);

export default Department;