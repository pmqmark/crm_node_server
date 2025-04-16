import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
    employee_ids: string[];
    description: string;
    meet_link: string;
    scheduled_time: Date;
    title: string;
    created_by: Schema.Types.ObjectId;
    status: 'Scheduled' | 'Completed' | 'Cancelled';
    created_at: Date;
    updated_at: Date;
}

const scheduleSchema = new Schema<ISchedule>({
    employee_ids: [{
        type: String,
        ref: 'Employee',
        required: true
    }],
    description: {
        type: String,
        required: true
    },
    meet_link: {
        type: String,
        required: true,
        validate: {
            validator: function(v: string) {
                // Basic validation for Google Meet links
                return /^https:\/\/meet\.google\.com\/[a-z0-9\-]+$/.test(v);
            },
            message: 'Invalid Google Meet link format'
        }
    },
    scheduled_time: {
        type: Date,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    status: {
        type: String,
        enum: ['Scheduled', 'Completed', 'Cancelled'],
        default: 'Scheduled'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Index for faster queries
scheduleSchema.index({ scheduled_time: 1 });
scheduleSchema.index({ employee_ids: 1 });
scheduleSchema.index({ status: 1 });

const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
export default Schedule;