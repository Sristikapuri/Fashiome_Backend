import request from "supertest";
import app from "../src/app";
import { ClothesModel } from "../src/models/clothes.model";
import { OrderModel } from "../src/models/order.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createAdminAndToken, createUser } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

async function createOrderDirectly(overrides: Record<string, unknown> = {}) {
  const { user } = await createUser();
  const clothe = await ClothesModel.create({
    name: "Test Item",
    category: "tops",
    size: "M",
    color: "Red",
    price: 50,
    stock: 5,
    status: "active",
  });

  return OrderModel.create({
    userId: user._id,
    items: [{ clotheId: clothe._id, quantity: 1, price: 50 }],
    shippingAddress: "1 Test Street",
    paymentMethod: "cod",
    subtotal: 50,
    tax: 2.5,
    total: 52.5,
    status: "pending",
    ...overrides,
  });
}

describe("GET /api/v1/admin/orders", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/admin/orders");
    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/v1/admin/orders/:id/status", () => {
  test("updates an order's status", async () => {
    const { token } = await createAdminAndToken();
    const order = await createOrderDirectly();

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shipped" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.status).toBe("shipped");

    const stored = await OrderModel.findById(order._id);
    expect(stored!.status).toBe("shipped");
  });
});
