import { OrderService } from "../../src/services/order.service";
import { OrderMongoRepository } from "../../src/repositories/order.repository";

describe("OrderService", () => {
  let service: OrderService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new OrderService();
  });

  describe("create", () => {
    test("should create new order", async () => {
      const orderData = {
        userId: "user123",
        items: [{ clotheId: "clothes1", quantity: 2, price: 29.99 }],
        shippingAddress: "123 Test St",
        subtotal: 59.98,
        tax: 0,
        total: 59.98,
      };

      const createSpy = jest
        .spyOn(OrderMongoRepository.prototype, "create")
        .mockResolvedValue({ _id: "order1", ...orderData } as any);

      const order = await service.create(orderData);
      expect(order).toBeDefined();
      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    test("should get order by ID", async () => {
      const orderId = "order123";
      const getByIdSpy = jest
        .spyOn(OrderMongoRepository.prototype, "getById")
        .mockResolvedValue({ _id: orderId } as any);

      const order = await service.getById(orderId);
      expect(order).toBeDefined();
      expect(getByIdSpy).toHaveBeenCalledWith(orderId);
    });
  });
});
