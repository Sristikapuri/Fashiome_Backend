import { CartMongoRepository } from "../../src/repositories/cart.repository";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("CartMongoRepository", () => {
  let repository: CartMongoRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new CartMongoRepository();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const userId = "507f1f77bcf86cd799439011";
  const clotheId1 = "507f1f77bcf86cd799439012";
  const clotheId2 = "507f1f77bcf86cd799439013";

  describe("upsertUserCart", () => {
    test("should create new cart", async () => {
      const items = [
        { clotheId: clotheId1, quantity: 2 },
        { clotheId: clotheId2, quantity: 1 },
      ];

      const cart = await repository.upsertUserCart(userId, items);

      expect(cart.userId.toString()).toBe(userId);
      expect(cart.items).toHaveLength(2);
    });
  });
});
