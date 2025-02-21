import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  permissionId: string;
  name: string;
}

const PermissionSchema: Schema = new Schema({
  permissionId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  }
}, { timestamps: true });

export default mongoose.model<IPermission>('Permission', PermissionSchema);