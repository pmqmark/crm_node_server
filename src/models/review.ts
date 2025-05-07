import mongoose, { Schema } from "mongoose";

export interface IReview extends Document {
    user_id: mongoose.Types.ObjectId;
    rating: number,
    comment: string,
    createdAt: Date,
}

const reviewSchema = new Schema<IReview>({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    rating: {
        type: Number,
        min: 1,
        max: 5,
    },

    comment: {
        type: String,
    },

    createdAt: {
        type: Date,
        default: Date.now,
      },

})

const Review = mongoose.model('Review', reviewSchema);

export { Review };