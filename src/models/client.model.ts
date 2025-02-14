import mongoose, { Schema, model } from 'mongoose';
import { IClient } from './interfaces/client.interface';

const clientSchema = new Schema<IClient>(
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
      required: false
    },
    packageDetails: {
      type: String,
      required: false
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

export const ClientModel = model<IClient>('Client', clientSchema);
