import mongoose, { Schema, Document } from 'mongoose';
export interface IProject extends Document {
    name: string;
    description: string;
    employees: mongoose.Types.ObjectId[];
    department_id: mongoose.Types.ObjectId;
    deadline: Date;
    created_at?: Date;
    created_by: mongoose.Types.ObjectId;
  }
  
  const projectSchema = new Schema<IProject>({
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    employees: [{
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    }],
    department_id: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
  });
  
  
  const Project = mongoose.model<IProject>('Project', projectSchema);
  
  export { Project };