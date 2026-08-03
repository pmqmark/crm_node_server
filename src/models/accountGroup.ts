import mongoose, { Schema, Document } from "mongoose";

export interface IAccountGroup extends Document {
  name: string;
  description?: string;
  type: "Assets" | "Liabilities" | "Equity" | "Income" | "Expenses";
  parent?: mongoose.Types.ObjectId;
  nature: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | "EQUITY";
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const AccountGroupSchema = new Schema<IAccountGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      enum: ["Assets", "Liabilities", "Equity", "Income", "Expenses"],
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "AccountGroup",
      required: false,
    },
    nature: {
      type: String,
      enum: ["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
  },
  { timestamps: true },
);

const AccountGroup =
  mongoose.models.AccountGroup ||
  mongoose.model<IAccountGroup>("AccountGroup", AccountGroupSchema);

export default AccountGroup;
