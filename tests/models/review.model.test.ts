import { ReviewModel } from "../../src/models/review.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

const objectId = (n: number) => `507f1f77bcf86cd7994390${String(n).padStart(2, "0")}`;

describe("ReviewModel", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("Review creation", () => {
    test("should create review with valid data", async () => {
      const reviewData = {
        userId: objectId(11),
        clotheId: objectId(12),
        rating: 5,
        title: "Great product",
        comment: "Really loved this item!",
        verifiedPurchase: true,
      };

      const review = await ReviewModel.create(reviewData);

      expect(review.userId.toString()).toBe(reviewData.userId);
      expect(review.clotheId.toString()).toBe(reviewData.clotheId);
      expect(review.rating).toBe(reviewData.rating);
      expect(review.title).toBe(reviewData.title);
      expect(review.comment).toBe(reviewData.comment);
      expect(review.verifiedPurchase).toBe(reviewData.verifiedPurchase);
    });

    test("should require rating field", async () => {
      const reviewData = {
        userId: objectId(11),
        clotheId: objectId(12),
        comment: "Great!",
      };

      await expect(ReviewModel.create(reviewData as any)).rejects.toThrow();
    });
  });

  describe("Review validation", () => {
    test("should enforce rating range 1-5", async () => {
      const invalidRatings = [0, 6, -1, 10];

      for (const rating of invalidRatings) {
        const reviewData = {
          userId: objectId(11),
          clotheId: objectId(12),
          rating,
          comment: "Test",
        };

        await expect(ReviewModel.create(reviewData as any)).rejects.toThrow();
      }
    });
  });
});
