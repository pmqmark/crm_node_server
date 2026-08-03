import mongoose, { Schema, Document } from "mongoose";

export interface ILedgerAccount extends Document {
  name: string;
  code?: string;
  group: mongoose.Types.ObjectId;
  type: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  normalBalance: "Debit" | "Credit";
  openingBalance: number;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerAccountSchema = new Schema<ILedgerAccount>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: false,
      trim: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "AccountGroup",
      required: true,
    },
    type: {
      type: String,
      enum: ["Asset", "Liability", "Equity", "Income", "Expense"],
      required: true,
    },
    normalBalance: {
      type: String,
      enum: ["Debit", "Credit"],
      required: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    description: {
      type: String,
      required: false,
    },
    isSystem: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true },
);

const LedgerAccount =
  mongoose.models.LedgerAccount ||
  mongoose.model<ILedgerAccount>("LedgerAccount", LedgerAccountSchema);

export default LedgerAccount;
