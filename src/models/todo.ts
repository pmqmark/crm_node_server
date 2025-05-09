import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export interface ISubtask {
  _id?: Types.ObjectId;
  title: string;
  completed: boolean;
}

export interface ITodo extends Document {
  employee_id?: Types.ObjectId;
  admin_id?: Types.ObjectId;
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
    index: true,
    // Only required if admin_id is not present
    required: function(this: any) {
      return !this.admin_id;
    }
  },
  admin_id: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    index: true,
    // Only required if employee_id is not present
    required: function(this: any) {
      return !this.employee_id;
    }
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

// Add validation to ensure exactly one owner type is specified (either employee OR admin)
todoSchema.pre('validate', function(next) {
  // Check if exactly one of employee_id or admin_id is set
  if ((!this.employee_id && !this.admin_id) || 
      (this.employee_id && this.admin_id)) {
    return next(new Error('A todo must belong to either an employee or an admin, but not both'));
  }
  next();
});

// Add compound index to optimize queries that filter by owner type and other fields
todoSchema.index({ employee_id: 1, created_at: -1 });
todoSchema.index({ admin_id: 1, created_at: -1 });
todoSchema.index({ isMyDay: 1 });
todoSchema.index({ isImportant: 1 });

const Todo = mongoose.model<ITodo>('Todo', todoSchema);
export default Todo;