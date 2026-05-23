import mongoose, { Schema, Document } from 'mongoose';
import User from './user'
import {IAdmin} from "../dtos/userdto"

const adminSchema = new Schema<IAdmin>({
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    admin_id: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
  });
const Admin = User.discriminator<IAdmin>('Admin', adminSchema);

export default Admin
