import { OrderModel } from "../../src/models/order.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("OrderModel", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("Order creation", () => {
    test("should create order with valid data", async () => {
      const orderData = {
        userId: "507f1f77bcf86cd799439011" as any,
        items: [
          { clotheId: "507f1f77bcf86cd799439012" as any, quantity: 2, price: 29.99 },
          { clotheId: "507f1f77bcf86cd799439013" as any, quantity: 1, price: 49.99 },
        ],
        subtotal: 109.97,
        tax: 10,
        total: 119.97,
        shippingAddress: "123 Test St, Kathmandu",
        status: "pending" as const,
      };

      const order = await OrderModel.create(orderData);

      expect(order.userId.toString()).toBe(orderData.userId);
      expect(order.items).toHaveLength(2);
      expect(order.subtotal).toBe(orderData.subtotal);
      expect(order.tax).toBe(orderData.tax);
      expect(order.total).toBe(orderData.total);
      expect(order.shippingAddress).toBe(orderData.shippingAddress);
      expect(order.status).toBe(orderData.status);
    });

    test("should require userId field", async () => {
      const orderData = {
        items: [{ clotheId: "507f1f77bcf86cd799439012" as any, quantity: 1, price: 29.99 }],
        subtotal: 29.99,
        tax: 0,
        total: 29.99,
        shippingAddress: "123 Test St",
      };

      await expect(OrderModel.create(orderData as any)).rejects.toThrow();
    });
  });

  describe("Order validation", () => {
    test("should enforce positive total", async () => {
      const orderData = {
        userId: "507f1f77bcf86cd799439011" as any,
        items: [{ clotheId: "507f1f77bcf86cd799439012" as any, quantity: 1, price: 29.99 }],
        subtotal: 29.99,
        tax: 0,
        total: -10,
        shippingAddress: "123 Test St",
      };

      await expect(OrderModel.create(orderData as any)).rejects.toThrow();
    });
  });
});
