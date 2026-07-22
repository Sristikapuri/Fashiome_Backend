import mongoose from "mongoose";
import { ReviewModel, IReview } from "../models/review.model";

export class ReviewMongoRepository {
  async create(review: {
    userId: string;
    clotheId: string;
    rating: number;
    title?: string;
    comment: string;
    verifiedPurchase?: boolean;
  }) {
    const newReview = new ReviewModel(review);
    return await newReview.save();
  }

  async getById(id: string) {
    return await ReviewModel.findById(id).populate("userId", "firstName lastName profileImage");
  }

  async getByClotheId(clotheId: string) {
    return await ReviewModel.find({ clotheId })
      .populate("userId", "firstName lastName profileImage")
      .sort({ createdAt: -1 });
  }

  async getByUserId(userId: string) {
    return await ReviewModel.find({ userId })
      .populate("clotheId", "name imageUrl")
      .sort({ createdAt: -1 });
  }

  async getByUserAndClothe(userId: string, clotheId: string) {
    return await ReviewModel.findOne({ userId, clotheId });
  }

  async update(
    id: string,
    review: Partial<Pick<IReview, "rating" | "title" | "comment">>
  ) {
    return await ReviewModel.findByIdAndUpdate(id, review, { new: true });
  }

  async delete(id: string) {
    return await ReviewModel.findByIdAndDelete(id);
  }

  async getAverageRating(clotheId: string) {
    const result = await ReviewModel.aggregate([
      { $match: { clotheId: new mongoose.Types.ObjectId(clotheId) } },
      {
        $group: {
          _id: "$clotheId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { averageRating: 0, totalReviews: 0 };
  }
}
