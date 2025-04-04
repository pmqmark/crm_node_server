import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  invoice_id: string;
  client_id: mongoose.Types.ObjectId;
  project_id?: mongoose.Types.ObjectId;
  amount: number;
  description?: string;
  invoiceDate: Date;
  dueDate: Date;
  status: 'Pending' | 'Paid' | 'Overdue';
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
  paymentDate?: Date;
}

// Counter schema for invoice IDs
const InvoiceCounterSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    default: 'invoiceId'
  },
  year: {
    type: Number,
    required: true
  },
  value: { 
    type: Number, 
    required: true,
    default: 0
  }
});

// Create the counter model
const InvoiceCounter = mongoose.models.InvoiceCounter || 
  mongoose.model('InvoiceCounter', InvoiceCounterSchema, 'invoicecounters');

const invoiceSchema = new Schema<IInvoice>({
  invoice_id: {
    type: String,
    required: false, // Auto-generated just like employee_id
  },
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: false
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue'],
    default: 'Pending',
    required: true
  },
  paymentDate: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { timestamps: true });

// Pre-save middleware to generate invoice_id
invoiceSchema.pre('save', async function(this: IInvoice & Document, next) {
  try {
    if (this.isNew && !this.invoice_id) {
      let isUnique = false;
      let invoiceId = '';
      let attempts = 0;
      const maxAttempts = 10; // Prevent infinite loops
      
      const currentYear = new Date().getFullYear();
      
      // Try to generate a unique ID
      while (!isUnique && attempts < maxAttempts) {
        try {
          // Use findOneAndUpdate with $setOnInsert to handle the initial creation if needed
          const counter = await InvoiceCounter.findOneAndUpdate(
            { name: 'invoiceId', year: currentYear },
            { 
              $inc: { value: 1 },
              $setOnInsert: { name: 'invoiceId', year: currentYear }
            },
            { 
              new: true, 
              upsert: true,
              setDefaultsOnInsert: true // This is a boolean now
            }
          );
          
          if (!counter) {
            throw new Error('Failed to generate invoice ID');
          }
          
          // Format: INV-YYYY-001 (padded to at least 3 digits)
          invoiceId = `INV-${currentYear}-${counter.value.toString().padStart(3, '0')}`;
          
          // Check if this ID already exists
          const existingInvoice = await mongoose.model('Invoice').findOne({ 
            invoice_id: invoiceId 
          });
          
          if (!existingInvoice) {
            // We found a unique ID
            isUnique = true;
            this.invoice_id = invoiceId;
          } else {
            // ID already exists, try again
            attempts++;
          }
        } catch (error) {
          console.error('Error generating invoice ID:', error);
          attempts++;
        }
      }
      
      if (!isUnique) {
        throw new Error(`Could not generate a unique invoice ID after ${maxAttempts} attempts`);
      }
    }
    
    // Auto set status to 'Overdue' if past due date
    if (this.status === 'Pending' && this.dueDate < new Date()) {
      this.status = 'Overdue';
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create indexes
invoiceSchema.index({ invoice_id: 1 }, { unique: true });
invoiceSchema.index({ client_id: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });

const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
export default Invoice;