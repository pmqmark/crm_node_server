import mongoose, { Schema, Document } from 'mongoose';
import { IEmployee } from '../dtos/userdto';

export enum LeaveType {
    MEDICAL = 'Medical Leave',
    CASUAL = 'Casual Leave',
    VACATION = 'Vacation'
}

export interface ILeave extends Document {
    employee_id: mongoose.Types.ObjectId;
    leaveType: LeaveType;
    fromDate: Date;
    toDate: Date;
    numberOfDays: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    comments?: string;  // Added comments field as optional
    approvedBy?: mongoose.Types.ObjectId;  // Admin who approved/rejected the request
    createdAt: Date;
    updatedAt: Date;
}

const leaveSchema = new Schema<ILeave>({
    employee_id: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    leaveType: {
        type: String,
        enum: Object.values(LeaveType),
        required: true
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },
    numberOfDays: {
        type: Number,
        required: true,
        min: 1
    },
    reason: {
        type: String,
        required: true
    },
    comments: {
        type: String,
        required: false  // Optional field for admin comments
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: false  // Optional because it's only set when approved/rejected
    }
}, {
    timestamps: true
});

// Add validation to ensure toDate is after fromDate
leaveSchema.pre('save', function(next) {
    if (this.fromDate > this.toDate) {
        next(new Error('End date must be after start date'));
    }
    next();
});

const Leave = mongoose.model<ILeave>('Leave', leaveSchema);
export default Leave;