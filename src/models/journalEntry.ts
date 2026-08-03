import mongoose, { Schema, Document } from "mongoose";

export interface IJournalEntryLine {
  ledgerAccount: mongoose.Types.ObjectId;
  debit: number;
  credit: number;
  description?: string;
}

export interface IJournalEntry extends Document {
  entryDate: Date;
  description?: string;
  reference?: string;
  sourceType?: string;
  sourceId?: mongoose.Types.ObjectId;
  entries: IJournalEntryLine[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntryLineSchema = new Schema<IJournalEntryLine>(
  {
    ledgerAccount: {
      type: Schema.Types.ObjectId,
      ref: "LedgerAccount",
      required: true,
    },
    debit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    credit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    description: {
      type: String,
      required: false,
    },
  },
  { _id: false },
);

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      required: false,
    },
    reference: {
      type: String,
      required: false,
      trim: true,
    },
    sourceType: {
      type: String,
      required: false,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    entries: {
      type: [JournalEntryLineSchema],
      required: true,
      validate: [
        (entries: IJournalEntryLine[]) => entries.length >= 2,
        "Journal entry must have at least two lines",
      ],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true },
);

JournalEntrySchema.pre("validate", function (next) {
  const entry = this as IJournalEntry;
  const totalDebit = entry.entries.reduce(
    (sum, line) => sum + (line.debit || 0),
    0,
  );
  const totalCredit = entry.entries.reduce(
    (sum, line) => sum + (line.credit || 0),
    0,
  );

  if (totalDebit !== totalCredit) {
    return next(
      new Error(
        "Journal entry must be balanced: total debit must equal total credit",
      ),
    );
  }

  if (entry.entries.some((line) => line.debit < 0 || line.credit < 0)) {
    return next(new Error("Journal entry amounts must be non-negative"));
  }

  return next();
});

JournalEntrySchema.index({ sourceType: 1, sourceId: 1 });

const JournalEntry =
  mongoose.models.JournalEntry ||
  mongoose.model<IJournalEntry>("JournalEntry", JournalEntrySchema);

export default JournalEntry;
