import mongoose, { Schema, Document } from "mongoose";
import { IUser, IAdmin, IEmployee } from "../dtos/userdto";
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      // Moved to base schema
      type: String,
      required: true,
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
  },
  { discriminatorKey: "role" }
);

// Create the base model
const User = mongoose.model<IUser>("User", userSchema);
export default User;
