import mongoose, { Schema } from "mongoose";
import { IRole } from "../dtos/roledto";

const roleSchema = new Schema<IRole>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true, // enforces one role name across the collection
  },
  description: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  permissions: [
    {
      type: String,
    },
  ],
});

const Role = mongoose.model<IRole>("Role", roleSchema);
export default Role;
