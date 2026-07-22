import { ReviewMongoRepository } from "../repositories/review.repository";

const reviewRepository = new ReviewMongoRepository();

export class ReviewService {
  async createReview(review: {
    userId: string;
    clotheId: string;
    rating: number;
    title?: string;
    comment: string;
    verifiedPurchase?: boolean;
  }) {
    return await reviewRepository.create(review);
  }

  async getReviewById(id: string) {
    return await reviewRepository.getById(id);
  }

  async getReviewsByClothe(clotheId: string) {
    return await reviewRepository.getByClotheId(clotheId);
  }

  async getReviewsByUser(userId: string) {
    return await reviewRepository.getByUserId(userId);
  }

  async updateReview(id: string, review: Partial<{
    rating: number;
    title?: string;
    comment: string;
  }>) {
    return await reviewRepository.update(id, review);
  }

  async deleteReview(id: string) {
    return await reviewRepository.delete(id);
  }

  async getClotheRating(clotheId: string) {
    return await reviewRepository.getAverageRating(clotheId);
  }

  async getUserReviewForClothe(userId: string, clotheId: string) {
    return await reviewRepository.getByUserAndClothe(userId, clotheId);
  }
}
