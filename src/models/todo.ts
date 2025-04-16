import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export interface ITodo extends Document {
  employee_id: Types.ObjectId;
  title: string;
  completed: boolean;
  created_at: Date;
}

const todoSchema = new Schema<ITodo>({
  employee_id: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Todo = mongoose.model<ITodo>('Todo', todoSchema);
export default Todo;