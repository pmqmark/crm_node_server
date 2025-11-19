import { Schema, model, Types } from "mongoose";

const projectDocumentationSchema = new Schema(
  {
    project_id: {
      type: Types.ObjectId,
      ref: "Project", // assumes you have a Project model
      required: true,
    },
    data: {
      type: String, // or Schema.Types.Mixed if you want flexible JSON
      required: true,
    },
    lastUpdate: {
      type: Date,
      default: Date.now, // auto-set to current time
    },
  },
  { timestamps: false } // we only keep lastUpdate, not createdAt/updatedAt
);

const ProjectDocumentation = model(
  "ProjectDocumentation",
  projectDocumentationSchema
);

export default ProjectDocumentation;
