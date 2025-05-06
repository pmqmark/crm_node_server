import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicy extends Document {
  title: string;
  content: string;
  dated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const policySchema = new Schema<IPolicy>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  dated: {
    type: Date,
    required: true,
    default: Date.now
  },
   
}, {
  timestamps: true
});

// Static method to get the single policy document
policySchema.statics.getPolicy = async function() {
  let policy = await this.findOne().sort({ updatedAt: -1 });
  return policy;
};

// Static method to update the policy
policySchema.statics.updatePolicy = async function(updateData: Partial<IPolicy>) {
  const policy = await this.findOne();
  if (policy) {
    Object.assign(policy, updateData);
    return await policy.save();
  }
  return await this.create(updateData);
};

// Prevent creating multiple documents
policySchema.pre('save', async function(next) {
  const policy = this;
  if (policy.isNew) {
    const count = await mongoose.model('Policy').countDocuments();
    if (count > 0) {
      throw new Error('Only one policy document can exist');
    }
  }
  next();
});

const Policy = mongoose.model<IPolicy>('Policy', policySchema);
export default Policy;