import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clotheId: mongoose.Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clotheId: { type: Schema.Types.ObjectId, ref: "Clothe", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 100 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index to ensure one review per user per product
ReviewSchema.index({ userId: 1, clotheId: 1 }, { unique: true });

export const ReviewModel = mongoose.model<IReview>("Review", ReviewSchema);
