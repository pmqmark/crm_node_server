import mongoose, { Schema, model } from 'mongoose';
import { IUser } from './interfaces/user.interface';

const clientSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    packageDetails: {
      type: String,
      required: true
    },
    isActive: { 
      type: Boolean,
      default: true // Default to active
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret.password;
        return ret;
      }
    }
  }
);

export const ClientModel = model<IUser>('Client', clientSchema);
