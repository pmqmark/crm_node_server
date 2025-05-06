import mongoose, { Schema, Document } from 'mongoose';

export interface IBirthdayWish extends Document {
    wisherEmployeeId: mongoose.Types.ObjectId; // Employee who sent the wish
    birthdayEmployeeId: mongoose.Types.ObjectId; // Employee whose birthday it is
    wishDate: Date; // The date the wish was sent (YYYY-MM-DD, time part irrelevant)
    createdAt: Date;
}

const birthdayWishSchema = new Schema<IBirthdayWish>({
    wisherEmployeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    birthdayEmployeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    wishDate: { // Store only the date part for daily check
        type: Date,
        required: true
    }
}, { timestamps: { createdAt: true, updatedAt: false } }); // Only need createdAt

// Index to quickly check if a wish was sent today by a specific user to another
// and to prevent duplicate wish entries for the same day.
birthdayWishSchema.index({ wisherEmployeeId: 1, birthdayEmployeeId: 1, wishDate: 1 }, { unique: true });

const BirthdayWish = mongoose.model<IBirthdayWish>('BirthdayWish', birthdayWishSchema);
export default BirthdayWish;