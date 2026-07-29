import request from "supertest";

// Order creation sends a confirmation email; mock EmailService the same way
// auth.test.ts does so no real SMTP connection is attempted.
const mockSendOrderConfirmation = jest.fn(async () => true);
jest.mock("../src/services/email.service", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendPasswordReset: jest.fn(async () => true),
    sendOrderConfirmation: mockSendOrderConfirmation,
  })),
}));

import app from "../src/app";
import { ClothesModel, type ClothingCategory } from "../src/models/clothes.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createRegularUserAndToken } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
  mockSendOrderConfirmation.mockClear();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

type ClothePayload = {
  name: string;
  category: ClothingCategory;
  size: string;
  color: string;
  price: number;
  stock: number;
  status: "active" | "inactive";
};

function clothePayload(overrides: Partial<ClothePayload> = {}): ClothePayload {
  return {
    name: "Evening Gown",
    category: "gown",
    size: "S",
    color: "Black",
    price: 120,
    stock: 8,
    status: "active",
    ...overrides,
  };
}

async function setupCartWithItem(token: string, overrides: Record<string, unknown> = {}) {
  const item = await ClothesModel.create(clothePayload(overrides));
  await request(app)
    .put("/api/v1/cart")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ clotheId: item._id.toString(), quantity: 2 }] });
  return item;
}

describe("POST /api/v1/orders", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).post("/api/v1/orders").send({ shippingAddress: "123 Main St" });
    expect(response.status).toBe(401);
  });

  test("places a cash-on-delivery order and computes subtotal/tax/total", async () => {
    const { token } = await createRegularUserAndToken();
    await setupCartWithItem(token, { price: 100 });

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        shippingAddress: "123 Main St",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        phone: "9800000000",
        city: "Kathmandu",
        postalCode: "44600",
      });

    expect(response.status).toBe(201);
    expect(response.body.responseData.order.subtotal).toBe(200);
    expect(response.body.responseData.order.tax).toBeCloseTo(10);
    expect(response.body.responseData.order.total).toBeCloseTo(210);
    expect(response.body.responseData.order.status).toBe("pending");
    expect(response.body.responseData.order.paymentMethod).toBe("cod");

    // The confirmation email is now sent in the background after the
    // response is returned, so give the fire-and-forget promise a tick.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockSendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  test("places an eSewa order without sending a confirmation email yet", async () => {
    const { token } = await createRegularUserAndToken();
    await setupCartWithItem(token, { price: 50 });

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        shippingAddress: "123 Main St",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        paymentMethod: "esewa",
      });

    expect(response.status).toBe(201);
    expect(response.body.responseData.order.paymentMethod).toBe("esewa");
    expect(response.body.responseData.order.esewaTransactionId).toBeTruthy();
    expect(response.body.responseMessage).toMatch(/complete esewa payment/i);
    expect(mockSendOrderConfirmation).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/orders/me", () => {
  test("returns the user's own orders enriched with item names", async () => {
    const { token } = await createRegularUserAndToken();
    await setupCartWithItem(token);
    await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddress: "123 Main St" });

    const response = await request(app).get("/api/v1/orders/me").set("Authorization", `Bearer ${token}`);

    expect(response.body.responseData.orders).toHaveLength(1);
    expect(response.body.responseData.orders[0].items[0].name).toBe("Evening Gown");
  });
});

describe("GET /api/v1/orders/:id", () => {
  test("returns 403 when the order belongs to another user", async () => {
    const { token: ownerToken } = await createRegularUserAndToken();
    await setupCartWithItem(ownerToken);
    const createResponse = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ shippingAddress: "123 Main St" });
    const orderId = createResponse.body.responseData.order._id;

    const { token: strangerToken } = await createRegularUserAndToken();
    const response = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(response.status).toBe(403);
  });
});
