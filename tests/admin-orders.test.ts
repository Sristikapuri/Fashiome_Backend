import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { ClothesModel } from "../src/models/clothes.model";
import { OrderModel } from "../src/models/order.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createAdminAndToken, createRegularUserAndToken, createUser } from "./setup/helpers";

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

  test("rejects a non-admin user with 403", async () => {
    const { token } = await createRegularUserAndToken();
    const response = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  test("returns paginated, enriched orders including resolved customer name and item details", async () => {
    const { token } = await createAdminAndToken();
    await createOrderDirectly({ customerName: "" });

    const response = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", `Bearer ${token}`)
      .query({ page: 1, limit: 15 });

    expect(response.status).toBe(200);
    expect(response.body.responseData.data).toHaveLength(1);
    expect(response.body.responseData.meta).toMatchObject({ page: 1, limit: 15, total: 1, totalPages: 1 });
    const [order] = response.body.responseData.data;
    expect(order.customerDisplayName).toEqual(expect.any(String));
    expect(order.items[0]).toMatchObject({ name: "Test Item" });
  });

  test("filters orders by status and paymentMethod query params", async () => {
    const { token } = await createAdminAndToken();
    await createOrderDirectly({ status: "pending", paymentMethod: "cod" });
    await createOrderDirectly({ status: "shipped", paymentMethod: "esewa" });

    const response = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", `Bearer ${token}`)
      .query({ status: "shipped", paymentMethod: "esewa" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.data).toHaveLength(1);
    expect(response.body.responseData.data[0].status).toBe("shipped");
  });

  test("clamps limit to a maximum of 50 and defaults invalid page/limit to 1/15", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", `Bearer ${token}`)
      .query({ page: "not-a-number", limit: "500" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.meta.page).toBe(1);
    expect(response.body.responseData.meta.limit).toBe(50);
  });
});

describe("GET /api/v1/admin/orders/stats", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/admin/orders/stats");
    expect(response.status).toBe(401);
  });

  test("returns aggregate order statistics for an admin", async () => {
    const { token } = await createAdminAndToken();
    await createOrderDirectly({ status: "paid", paymentMethod: "esewa", total: 100 });
    await createOrderDirectly({ status: "pending", paymentMethod: "cod", total: 50 });

    const response = await request(app)
      .get("/api/v1/admin/orders/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.totalOrders).toBe(2);
    expect(response.body.responseData.paidOrders).toBe(1);
    expect(response.body.responseData.pendingOrders).toBe(1);
    expect(response.body.responseData.totalRevenue).toBe(100);
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

  test("rejects an invalid status value with 400", async () => {
    const { token } = await createAdminAndToken();
    const order = await createOrderDirectly();

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "not-a-real-status" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/Status must be one of/);
  });

  test("returns 404 when the order does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${missingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shipped" });

    expect(response.status).toBe(404);
  });

  test("rejects a non-admin user with 403", async () => {
    const { token } = await createRegularUserAndToken();
    const order = await createOrderDirectly();

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shipped" });

    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/v1/admin/orders/:id", () => {
  test("deletes an existing order", async () => {
    const { token } = await createAdminAndToken();
    const order = await createOrderDirectly();

    const response = await request(app)
      .delete(`/api/v1/admin/orders/${order._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await OrderModel.findById(order._id)).toBeNull();
  });

  test("returns 404 when deleting an order that does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .delete(`/api/v1/admin/orders/${missingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
