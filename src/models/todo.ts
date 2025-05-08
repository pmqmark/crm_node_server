import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export interface ISubtask {
  _id?: Types.ObjectId;
  title: string;
  completed: boolean;
}

export interface ITodo extends Document {
  employee_id: Types.ObjectId;
  title: string;
  completed: boolean;
  isImportant: boolean;
  isMyDay: boolean;
  dueDate: Date | null;  
  reminderDate: Date | null;  
  subtasks: ISubtask[];
  created_at: Date;
  updated_at: Date;
}

const subtaskSchema = new Schema<ISubtask>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  }
});

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
  isImportant: {
    type: Boolean,
    default: false
  },
  isMyDay: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date,
    default: null
  },
  reminderDate: {
    type: Date,
    default: null
  },
  subtasks: [subtaskSchema],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

const Todo = mongoose.model<ITodo>('Todo', todoSchema);
export default Todo;