import { Request, Response } from "express";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { ReviewService } from "../services/review.service";
import type { AuthenticatedRequest } from "../middlewares/authorized.middleware";

const reviewService = new ReviewService();

const normalizeRouteParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const getUserId = (req: Request) => {
  const user = (req as AuthenticatedRequest).user;
  const userId = user?._id?.toString();
  if (!userId) {
    throw new HttpException(401, "Unauthorized user missing");
  }
  return userId;
};

export class ReviewController {
  async createReview(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { clotheId, rating, title, comment } = req.body || {};

      if (!clotheId || !rating || !comment) {
        throw new HttpException(400, "Clothe ID, rating, and comment are required");
      }

      if (rating < 1 || rating > 5) {
        throw new HttpException(400, "Rating must be between 1 and 5");
      }

      // Check if user already reviewed this product
      const existingReview = await reviewService.getUserReviewForClothe(userId, clotheId);
      if (existingReview) {
        throw new HttpException(400, "You have already reviewed this product");
      }

      const review = await reviewService.createReview({
        userId,
        clotheId,
        rating,
        title,
        comment,
      });

      return ApiResponseHelper.success(res, review.toObject(), "Review created successfully", 201);
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to create review"), getErrorStatus(error));
    }
  }

  async getReviewsByClothe(req: Request, res: Response) {
    try {
      const clotheId = normalizeRouteParam(req.params.clotheId);

      if (!clotheId) {
        throw new HttpException(400, "Clothe ID is required");
      }

      const reviews = await reviewService.getReviewsByClothe(clotheId);
      const ratingStats = await reviewService.getClotheRating(clotheId);

      return ApiResponseHelper.success(
        res,
        {
          reviews,
          stats: ratingStats,
        },
        "Reviews retrieved successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to retrieve reviews"), getErrorStatus(error));
    }
  }

  async getMyReviews(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const reviews = await reviewService.getReviewsByUser(userId);

      return ApiResponseHelper.success(res, reviews, "Your reviews retrieved successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to retrieve reviews"), getErrorStatus(error));
    }
  }

  async updateReview(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const id = normalizeRouteParam(req.params.id);
      const { rating, title, comment } = req.body || {};

      if (!id) {
        throw new HttpException(400, "Review ID is required");
      }

      // Check if user owns this review
      const existingReview = await reviewService.getReviewById(id);
      if (!existingReview) {
        throw new HttpException(404, "Review not found");
      }

      if (existingReview.userId.toString() !== userId) {
        throw new HttpException(403, "You can only update your own reviews");
      }

      if (rating && (rating < 1 || rating > 5)) {
        throw new HttpException(400, "Rating must be between 1 and 5");
      }

      const updatedReview = await reviewService.updateReview(id, {
        rating,
        title,
        comment,
      });

      return ApiResponseHelper.success(res, updatedReview.toObject(), "Review updated successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to update review"), getErrorStatus(error));
    }
  }

  async deleteReview(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const id = normalizeRouteParam(req.params.id);

      if (!id) {
        throw new HttpException(400, "Review ID is required");
      }

      // Check if user owns this review
      const existingReview = await reviewService.getReviewById(id);
      if (!existingReview) {
        throw new HttpException(404, "Review not found");
      }

      if (existingReview.userId.toString() !== userId) {
        throw new HttpException(403, "You can only delete your own reviews");
      }

      await reviewService.deleteReview(id);

      return ApiResponseHelper.success(res, null, "Review deleted successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to delete review"), getErrorStatus(error));
    }
  }
}
