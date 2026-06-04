import mongoose, { Schema, Document } from "mongoose";
import { IUser, IAdmin, IEmployee } from "../dtos/userdto";
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: false,
    },
    password: {
      // Moved to base schema
      type: String,
      required: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "employee", "client"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { discriminatorKey: "role" },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  },
);

// Create the base model
const User = mongoose.model<IUser>("User", userSchema);
export default User;
