import { ReviewMongoRepository } from "../../src/repositories/review.repository";
import { ReviewModel } from "../../src/models/review.model";
import "../../src/models/user.model";
import "../../src/models/clothes.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("ReviewMongoRepository", () => {
  let repository: ReviewMongoRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new ReviewMongoRepository();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("create", () => {
    test("should create new review", async () => {
      const reviewData = {
        userId: "507f1f77bcf86cd799439011",
        clotheId: "507f1f77bcf86cd799439012",
        rating: 5,
        comment: "Great product!",
      };

      const review = await repository.create(reviewData);

      expect(review.userId.toString()).toBe(reviewData.userId);
      expect(review.rating).toBe(reviewData.rating);
    });
  });

  describe("getAverageRating", () => {
    test("should calculate average rating", async () => {
      const clotheId = "507f1f77bcf86cd799439012";

      await ReviewModel.create({
        userId: "507f1f77bcf86cd799439013",
        clotheId,
        rating: 5,
        comment: "Great!",
      });

      await ReviewModel.create({
        userId: "507f1f77bcf86cd799439014",
        clotheId,
        rating: 3,
        comment: "Okay",
      });

      const average = await repository.getAverageRating(clotheId);
      expect(average.averageRating).toBe(4);
    });
  });
});
