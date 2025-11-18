import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  project_id: Schema.Types.ObjectId;
  assigned_employees: string[];
  description: string;
  status: "Pending" | "In Progress" | "Completed" | "On Hold";
  dueDate?: Date;
  priority?: "Low" | "Medium" | "High";
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assigned_employees: [
      {
        type: String,
        ref: "Employee",
        required: true,
      },
    ],
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Completed",
        "On Hold",
        "Done",
        "Assigned",
        "Under Planning",
      ],
      default: "Pending",
    },
    dueDate: {
      type: Date,
      required: false,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ assigned_employees: 1 });

const Task = mongoose.model<ITask>("Task", taskSchema);
export default Task;
