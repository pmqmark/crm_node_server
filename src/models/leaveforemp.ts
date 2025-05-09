import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveForEmp extends Document {
    name: string;
    description?: string;
    days: number;
    year: number;
    isDefault: boolean;
    isHoliday: boolean;
    isSpecific: boolean;
    holidayDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const leaveForEmpSchema = new Schema<ILeaveForEmp>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    days: {
        type: Number,
        required: false,
        min: 0
    },
    year: {
        type: Number,
        required: true,
        validate: {
            validator: function(value: number) {
                return value >= new Date().getFullYear();
            },
            message: 'Year must be current or future year'
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isHoliday: {
        type: Boolean,
        default: false
    },
    holidayDate: {
        type: Date,
        required: function(this: ILeaveForEmp) {
            return this.isHoliday === true;
        },
        validate: {
            validator: function(value: Date) {
                if (!this.isHoliday) return true;
                const holidayYear = value.getFullYear();
                return holidayYear === this.year;
            },
            message: 'Holiday date must be in the same year as specified'
        }
    },
    isSpecific: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Pre-save middleware to check for default document
leaveForEmpSchema.pre('save', async function(next) {
    try {
        if (this.isDefault) {
            const existingDefault = await (this.constructor as any).findOne({ 
                isDefault: true,
                _id: { $ne: this._id } 
            });
            
            if (existingDefault) {
                throw new Error('Only one default leave configuration can exist');
            }
        }

        // Validate that specific and default cannot both be true
        if (this.isDefault && this.isSpecific) {
            throw new Error('Leave configuration cannot be both default and specific');
        }

        // Validate holiday date if isHoliday is true
        if (this.isHoliday && !this.holidayDate) {
            throw new Error('Holiday date is required when isHoliday is true');
        }

        next();
    } catch (error) {
        throw new Error("some uncaught error occured " );
    }
});

// Create indexes for better query performance
leaveForEmpSchema.index({ year: 1, isDefault: 1 });
leaveForEmpSchema.index({ year: 1, isSpecific: 1 });
leaveForEmpSchema.index({ holidayDate: 1 });

const LeaveForEmp = mongoose.model<ILeaveForEmp>('LeaveForEmp', leaveForEmpSchema);
export default LeaveForEmp;