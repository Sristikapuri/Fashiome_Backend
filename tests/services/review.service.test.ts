import { ReviewService } from "../../src/services/review.service";
import { ReviewMongoRepository } from "../../src/repositories/review.repository";

describe("ReviewService", () => {
  let service: ReviewService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new ReviewService();
  });

  describe("createReview", () => {
    test("should create new review", async () => {
      const reviewData = {
        userId: "user123",
        clotheId: "clothes123",
        rating: 5,
        comment: "Great product!",
      };

      const createSpy = jest
        .spyOn(ReviewMongoRepository.prototype, "create")
        .mockResolvedValue({ _id: "review1", ...reviewData } as any);

      const review = await service.createReview(reviewData);
      expect(review).toBeDefined();
      expect(createSpy).toHaveBeenCalledWith(reviewData);
    });
  });
});
