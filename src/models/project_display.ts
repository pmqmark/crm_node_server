import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProjectDisplay extends Document {
  project_id: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectDisplaySchema = new Schema<IProjectDisplay>({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true,
    // Remove index: true here since we're using schema.index() below
  },
  content: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Ensure one display document per project
projectDisplaySchema.pre('save', async function(this: IProjectDisplay & Document, next) {
  if (this.isNew) {
    const model = this.constructor as Model<IProjectDisplay>;
    const existingDisplay = await model.findOne({ 
      project_id: this.project_id 
    });
    if (existingDisplay) {
      throw new Error('Display content already exists for this project');
    }
  }
  next();
});

// Single index declaration


const ProjectDisplay = mongoose.model<IProjectDisplay>('ProjectDisplay', projectDisplaySchema);
export default ProjectDisplay;