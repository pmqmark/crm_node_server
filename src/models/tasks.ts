import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  project_id: Schema.Types.ObjectId;
  assigned_employees: Schema.Types.ObjectId[]; // better to store ObjectIds
  description: string;
  status:
    | "Pending"
    | "In Progress"
    | "Completed"
    | "On Hold"
    | "Done"
    | "Assigned"
    | "Under Planning";
  dueDate?: Date;
  priority?: "Low" | "Medium" | "High";
  createdBy: Schema.Types.ObjectId; // reference to Employee/User
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
        type: Schema.Types.ObjectId,
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
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee", // or "User" depending on your auth model
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ assigned_employees: 1 });
taskSchema.index({ createdBy: 1 });

const Task = mongoose.model<ITask>("Task", taskSchema);
export default Task;
