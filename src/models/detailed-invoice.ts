import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  invoice_id: string;
  client_id: mongoose.Types.ObjectId;
  project_id?: mongoose.Types.ObjectId;
  items: Array<{
    service_name: string;
    service_type: 'hourly' | 'fixed' | 'subscription';
    hours?: number;
    rate_per_hour?: number;
    fixed_price?: number;
    quantity?: number;
    total: number;
    description?: string;
    service_period_start?: Date;
    service_period_end?: Date;
  }>;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  description?: string;
  terms?: string;
  invoiceDate: Date;
  dueDate: Date;
  status: 'Pending' | 'Paid' | 'Overdue';
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
  paymentDate?: Date;
  isVisible: boolean;
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
    required: false, // Auto-generated
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
  items: [{
    service_name: {
      type: String,
      required: true
    },
    service_type: {
      type: String,
      enum: ['hourly', 'fixed', 'subscription'],
      required: true
    },
    hours: {
      type: Number,
      required: false,
      min: 0
    },
    rate_per_hour: {
      type: Number,
      required: false,
      min: 0
    },
    fixed_price: {
      type: Number,
      required: false,
      min: 0
    },
    quantity: {
      type: Number,
      required: false,
      min: 1,
      default: 1
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: false
    },
    service_period_start: {
      type: Date,
      required: false
    },
    service_period_end: {
      type: Date,
      required: false
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  tax_rate: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  },
  tax_amount: {
    type: Number,
    required: false,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  terms: {
    type: String,
    required: false,
    maxlength: 2000
  },
  description: {
    type: String,
    required: false,
    maxlength: 1000
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
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Pre-save middleware to handle calculations and ID generation
invoiceSchema.pre('save', async function(this: IInvoice & Document, next) {
  try {
    // Calculate line item totals
    this.items.forEach(item => {
      if (item.service_type === 'hourly') {
        item.total = (item.hours || 0) * (item.rate_per_hour || 0);
      } else if (item.service_type === 'fixed' || item.service_type === 'subscription') {
        item.total = (item.fixed_price || 0) * (item.quantity || 1);
      }
    });

    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);

    // Calculate tax if applicable
    if (this.tax_rate) {
      this.tax_amount = (this.subtotal * this.tax_rate) / 100;
    }

    // Calculate total amount
    this.total_amount = this.subtotal + (this.tax_amount || 0);

    // Generate invoice_id for new invoices
    if (this.isNew && !this.invoice_id) {
      let isUnique = false;
      let invoiceId = '';
      let attempts = 0;
      const maxAttempts = 10;
      
      const currentYear = new Date().getFullYear();
      
      while (!isUnique && attempts < maxAttempts) {
        try {
          const counter = await InvoiceCounter.findOneAndUpdate(
            { name: 'invoiceId', year: currentYear },
            { 
              $inc: { value: 1 },
              $setOnInsert: { name: 'invoiceId', year: currentYear }
            },
            { 
              new: true, 
              upsert: true,
              setDefaultsOnInsert: true
            }
          );
          
          if (!counter) {
            throw new Error('Failed to generate invoice ID');
          }
          
          invoiceId = `INV-${currentYear}-${counter.value.toString().padStart(3, '0')}`;
          
          const existingInvoice = await mongoose.model('Invoice').findOne({ 
            invoice_id: invoiceId 
          });
          
          if (!existingInvoice) {
            isUnique = true;
            this.invoice_id = invoiceId;
          } else {
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
invoiceSchema.index({ isVisible: 1 });

const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
export default Invoice;