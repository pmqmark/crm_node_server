import mongoose, { Schema, Document } from "mongoose";

export type VoucherType =
  | "JOURNAL"
  | "CONTRA"
  | "SALES"
  | "PURCHASE"
  | "RECEIPT"
  | "PAYMENT";

export interface IVoucherLine {
  ledgerAccount: mongoose.Types.ObjectId;
  debit: number;
  credit: number;
  narration?: string;
}

export interface IVoucher extends Document {
  voucher_no: string;
  voucherType: VoucherType;
  date: Date;
  branch?: string;
  narration?: string;
  referenceType?: string;
  reference?: string;
  sourceType?: string;
  sourceId?: mongoose.Types.ObjectId;
  status: "ACTIVE" | "INACTIVE";
  lines: IVoucherLine[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherLineSchema = new Schema<IVoucherLine>(
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
    narration: {
      type: String,
      required: false,
    },
  },
  { _id: false },
);

const VoucherSchema = new Schema<IVoucher>(
  {
    voucher_no: {
      type: String,
      required: true,
      unique: true,
    },
    voucherType: {
      type: String,
      enum: ["JOURNAL", "CONTRA", "SALES", "PURCHASE", "RECEIPT", "PAYMENT"],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    branch: {
      type: String,
      required: false,
    },
    narration: {
      type: String,
      required: false,
    },
    referenceType: {
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
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      required: true,
    },
    lines: {
      type: [VoucherLineSchema],
      required: true,
      validate: [
        (lines: IVoucherLine[]) => lines.length >= 2,
        "Voucher must have at least two lines",
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

const VoucherCounterSchema = new Schema({
  name: {
    type: String,
    required: true,
    default: "voucherId",
  },
  year: {
    type: Number,
    required: true,
  },
  value: {
    type: Number,
    required: true,
    default: 0,
  },
});

const VoucherCounter =
  mongoose.models.VoucherCounter ||
  mongoose.model("VoucherCounter", VoucherCounterSchema, "vouchercounters");

VoucherSchema.pre("validate", async function (next) {
  const voucher = this as IVoucher;

  const totalDebit = voucher.lines.reduce(
    (sum, line) => sum + (line.debit || 0),
    0,
  );
  const totalCredit = voucher.lines.reduce(
    (sum, line) => sum + (line.credit || 0),
    0,
  );

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return next(
      new Error(
        "Voucher must be balanced: total debit must equal total credit",
      ),
    );
  }

  if (voucher.lines.some((line) => line.debit < 0 || line.credit < 0)) {
    return next(new Error("Voucher amounts must be non-negative"));
  }

  if (voucher.isNew && !voucher.voucher_no) {
    const currentYear = new Date().getFullYear();
    const prefixes: Record<VoucherType, string> = {
      SALES: "SV",
      PURCHASE: "PV",
      RECEIPT: "RV",
      PAYMENT: "PMV",
      CONTRA: "CV",
      JOURNAL: "JV",
    };
    const counterName = `${voucher.voucherType}Id`;
    const counter = await VoucherCounter.findOneAndUpdate(
      { name: counterName, year: currentYear },
      {
        $inc: { value: 1 },
        $setOnInsert: { name: counterName, year: currentYear },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const sequence = counter.value.toString().padStart(4, "0");
    voucher.voucher_no = `${prefixes[voucher.voucherType]}${sequence}`;
  }

  next();
});

VoucherSchema.index({ sourceType: 1, sourceId: 1 });

const Voucher =
  mongoose.models.Voucher || mongoose.model<IVoucher>("Voucher", VoucherSchema);

export default Voucher;
