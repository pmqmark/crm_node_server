import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  ticketCode: string;
  client_id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: mongoose.Types.ObjectId;
  clientResolved: boolean; 
  clientResolvedAt?: Date;
  comments?: Array<{
    _id?: mongoose.Types.ObjectId;
    text: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
}

// Counter for ticket codes
const TicketCounterSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  value: { 
    type: Number, 
    required: true,
    default: 0
  }
});

const TicketCounter = mongoose.model('TicketCounter', TicketCounterSchema);

const ticketSchema = new Schema<ITicket>({
  ticketCode: {
    type: String,
    required: false 
  },
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
    default: 'Pending',
    required: true
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: false
  },
  clientResolved: {
    type: Boolean,
    default: false
  },
  clientResolvedAt: {
    type: Date,
    required: false
  },
  comments: [{
    text: {
      type: String,
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Generate ticket code middleware - fixed implementation
ticketSchema.pre('validate', async function(this: ITicket & Document, next) {
  try {
    if (this.isNew && !this.ticketCode) {
      // Get counter or create it if it doesn't exist
      const counter = await TicketCounter.findOneAndUpdate(
        { name: 'ticketId' },
        { $inc: { value: 1 } },
        { 
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
      
      if (!counter) {
        throw new Error('Failed to generate ticket code');
      }
      
      // Format: T followed by counter value (padded to at least 3 digits)
      this.ticketCode = 'T' + counter.value.toString().padStart(3, '0');
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add a post-save hook to validate the ticketCode is present
ticketSchema.post('validate', function(doc) {
  if (!doc.ticketCode) {
    const error = new Error('Ticket code generation failed');
    throw error;
  }
});

// Add the unique index explicitly
ticketSchema.index({ ticketCode: 1 }, { unique: true });

// Other indexes for performance
ticketSchema.index({ client_id: 1, status: 1 });
ticketSchema.index({ priority: 1 });

const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
export default Ticket;