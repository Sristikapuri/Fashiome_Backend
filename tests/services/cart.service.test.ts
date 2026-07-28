import { CartService } from "../../src/services/cart.service";
import { CartMongoRepository } from "../../src/repositories/cart.repository";

describe("CartService", () => {
  let service: CartService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new CartService();
  });

  describe("getCart", () => {
    test("should get user cart", async () => {
      const userId = "user123";
      const getByUserIdSpy = jest
        .spyOn(CartMongoRepository.prototype, "getByUserId")
        .mockResolvedValue({ userId, items: [] } as any);

      const cart = await service.getCart(userId);
      expect(cart).toBeDefined();
      expect(getByUserIdSpy).toHaveBeenCalledWith(userId);
    });
  });
});
