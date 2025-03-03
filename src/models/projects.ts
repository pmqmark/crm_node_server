import mongoose, { Schema, Document } from 'mongoose';
export interface IProject {
  projectName: string;
  client: Schema.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  priority: 'Low' | 'Medium' | 'High';
  projectValue: number;
  projectDescription: string;
  teamMembers?: Schema.Types.ObjectId[];
  teamLeaders?: Schema.Types.ObjectId[];
  managers?: Schema.Types.ObjectId[];
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  tags?: ('Urgent' | 'Internal' | 'Client-Facing' | 'Research' | 'Maintenance')[];
  created_at?: Date;
  created_by: Schema.Types.ObjectId;
}
  
export const projectSchema = new Schema<IProject>({
  projectName: {
    type: String,
    required: true,
  },
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true,
  },
  projectValue: {
    type: Number,
    required: true,
  },
  projectDescription: {
    type: String,
    required: true,
  },
  teamMembers: [{
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: false,
  }],
  teamLeaders: [{
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: false,
  }],
  managers: [{
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: false,
  }],
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
    required: true,
  },
  tags: {
    type: [String],
    enum: ['Urgent', 'Internal', 'Client-Facing', 'Research', 'Maintenance'],
    default: ['Internal'],
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