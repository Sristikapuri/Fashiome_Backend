import { CartModel } from "../../src/models/cart.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

const userId = "507f1f77bcf86cd799439011";
const clotheId1 = "507f1f77bcf86cd799439012";
const clotheId2 = "507f1f77bcf86cd799439013";

describe("CartModel", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("Cart creation", () => {
    test("should create cart with valid data", async () => {
      const cartData = {
        userId,
        items: [
          { clotheId: clotheId1, quantity: 2 },
          { clotheId: clotheId2, quantity: 1 },
        ],
      };

      const cart = await CartModel.create(cartData);

      expect(cart.userId.toString()).toBe(userId);
      expect(cart.items).toHaveLength(2);
      expect(cart.items[0].clotheId.toString()).toBe(clotheId1);
      expect(cart.items[0].quantity).toBe(2);
    });

    test("should require userId field", async () => {
      const cartData = {
        items: [{ clotheId: clotheId1, quantity: 1 }],
      };

      await expect(CartModel.create(cartData as any)).rejects.toThrow();
    });
  });

  describe("Cart validation", () => {
    test("should enforce positive quantity", async () => {
      const cartData = {
        userId,
        items: [{ clotheId: clotheId1, quantity: -1 }],
      };

      await expect(CartModel.create(cartData as any)).rejects.toThrow();
    });
  });
});
