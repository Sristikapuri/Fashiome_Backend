import { OrderMongoRepository } from "../../src/repositories/order.repository";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("OrderMongoRepository", () => {
  let repository: OrderMongoRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new OrderMongoRepository();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("create", () => {
    test("should create new order", async () => {
      const orderData = {
        userId: "507f1f77bcf86cd799439011" as any,
        items: [{ clotheId: "507f1f77bcf86cd799439012" as any, quantity: 2, price: 29.99 }],
        subtotal: 59.98,
        tax: 5,
        total: 64.98,
        shippingAddress: "123 Test St",
      };

      const order = await repository.create(orderData);

      expect(order.userId.toString()).toBe(orderData.userId);
      expect(order.total).toBe(orderData.total);
    });
  });
});
