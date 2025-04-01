import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceLog extends Document {
    employee_id: mongoose.Types.ObjectId;
    date: Date;
    punchIn: Date;
    punchOut: Date | null;
    totalHours: number;
    status: 'Present' | 'Absent' | 'Half-Day';
    comments?: string;
}

const attendanceLogSchema = new Schema<IAttendanceLog>({
    employee_id: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: Date,
        required: true,
        index: true // Add index for faster date-based queries
    },
    punchIn: {
        type: Date,
        required: true
    },
    punchOut: {
        type: Date,
        default: null
    },
    totalHours: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Half-Day'],
        default: 'Present'
    },
    comments: {
        type: String
    }
}, {
    timestamps: true
});

// Create compound index for efficient employee-date queries
attendanceLogSchema.index({ employee_id: 1, date: 1 }, { unique: true });

// Calculate total hours when punch-out is recorded
attendanceLogSchema.pre('save', function(next) {
    if (this.punchIn && this.punchOut) {
        const hours = (this.punchOut.getTime() - this.punchIn.getTime()) / (1000 * 60 * 60);
        this.totalHours = Number(hours.toFixed(2));
        
        // Update status based on total hours
        if (this.totalHours < 4) {
            this.status = 'Absent';
        } else if (this.totalHours < 8) {
            this.status = 'Half-Day';
        } else {
            this.status = 'Present';
        }
    }
    next();
});

const AttendanceLog = mongoose.model<IAttendanceLog>('AttendanceLog', attendanceLogSchema);
export default AttendanceLog;