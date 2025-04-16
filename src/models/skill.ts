import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export interface ISkill extends Document {
  employee_id: Types.ObjectId;
  name: string;
  proficiency: number; // 0, 25, 50, 75, 100
  created_at: Date;
  updated_at: Date;
}

const skillSchema = new Schema<ISkill>({
  employee_id: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  proficiency: {
    type: Number,
    required: true,
    enum: [0, 25, 50, 75, 100],
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index to prevent duplicate skills for the same employee
skillSchema.index({ employee_id: 1, name: 1 }, { unique: true });

export default mongoose.model<ISkill>('Skill', skillSchema);