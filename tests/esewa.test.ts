import crypto from "crypto";
import request from "supertest";


const mockGetPaymentStatus = jest.fn(async () => ({ status: "COMPLETE", refId: "REF-MOCK-1" }));
jest.mock("../src/services/esewa.service", () => {
  const actual = jest.requireActual("../src/services/esewa.service");
  return {
    ...actual,
    EsewaService: jest.fn().mockImplementation(() => {
      const real = new actual.EsewaService();
      real.getPaymentStatus = mockGetPaymentStatus;
      return real;
    }),
  };
});

import app from "../src/app";
import { OrderModel } from "../src/models/order.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createRegularUserAndToken, createUser } from "./setup/helpers";

const ESEWA_SECRET =
  process.env.ESEWA_SECRET || process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const PRODUCT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";

function signFields(fields: Record<string, unknown>, signedFieldNames: string[]): string {
  const message = signedFieldNames.map((field) => `${field}=${String(fields[field] ?? "")}`).join(",");
  return crypto.createHmac("sha256", ESEWA_SECRET).update(message).digest("base64");
}

function encodeEsewaData(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
  jest.clearAllMocks();
  mockGetPaymentStatus.mockResolvedValue({ status: "COMPLETE", refId: "REF-MOCK-1" });
});

afterAll(async () => {
  await disconnectTestDatabase();
});

async function createPendingOrder(userId: string, total = 100) {
  return OrderModel.create({
    userId,
    items: [],
    shippingAddress: "1 Test Street",
    paymentMethod: "esewa",
    subtotal: total,
    tax: 0,
    total,
    status: "pending",
  });
}

describe("GET /api/v1/esewa/checkout (public)", () => {
  test("rejects a request with no query parameters", async () => {
    const response = await request(app).get("/api/v1/esewa/checkout");
    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/invalid or expired payment checkout link/i);
  });

  test("renders the auto-submitting eSewa form for a valid checkout link obtained from payment-url", async () => {
    const { token: authToken, user } = await createRegularUserAndToken();
    const order = await createPendingOrder(user._id.toString(), 150);

    const paymentUrlResponse = await request(app)
      .get("/api/v1/esewa/payment-url")
      .set("Authorization", `Bearer ${authToken}`)
      .query({ amount: "150", orderId: order._id.toString() });
    expect(paymentUrlResponse.status).toBe(200);

    const checkoutUrl = new URL(paymentUrlResponse.body.responseData.paymentUrl);
    const response = await request(app).get(checkoutUrl.pathname + checkoutUrl.search);

    expect(response.status).toBe(200);
    expect(response.type).toBe("text/html");
    expect(response.text).toContain("Redirecting to Secure eSewa Gateway");
    expect(response.text).toMatch(
      new RegExp(`name="transaction_uuid" value="${order._id.toString()}-[0-9a-f]+"`)
    );
  });
});

describe("GET /api/v1/esewa/payment-url", () => {
  test("returns a working checkout URL for a valid pending order", async () => {
    const { token, user } = await createRegularUserAndToken();
    const order = await createPendingOrder(user._id.toString(), 100);

    const response = await request(app)
      .get("/api/v1/esewa/payment-url")
      .set("Authorization", `Bearer ${token}`)
      .query({ amount: "100", orderId: order._id.toString() });

    expect(response.status).toBe(200);
    expect(response.body.responseData.paymentUrl).toContain("/api/v1/esewa/checkout");
    expect(response.body.responseData.paymentUrl).toContain(order._id.toString());
  });
});

describe("POST /api/v1/esewa/verify", () => {
  test("returns 404 for a non-existent order", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .post("/api/v1/esewa/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId: "507f1f77bcf86cd799439011" });

    expect(response.status).toBe(404);
  });

  test("without a data payload: marks the order paid when the status API reports COMPLETE", async () => {
    const { token, user } = await createRegularUserAndToken();
    const order = await createPendingOrder(user._id.toString(), 100);

    const response = await request(app)
      .post("/api/v1/esewa/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId: order._id.toString() });

    expect(response.status).toBe(200);
    expect(response.body.responseData.verified).toBe(true);
    expect(response.body.responseData.refId).toBe("REF-MOCK-1");

    const stored = await OrderModel.findById(order._id);
    expect(stored!.status).toBe("paid");
    expect(stored!.esewaRefId).toBe("REF-MOCK-1");
  });

  test("with a signed data payload: verifies and marks the order paid", async () => {
    const { token, user } = await createRegularUserAndToken();
    const order = await createPendingOrder(user._id.toString(), 250);
    const orderId = order._id.toString();

    const fields: Record<string, unknown> = {
      total_amount: "250.00",
      transaction_uuid: orderId,
      product_code: PRODUCT_CODE,
      transaction_code: "TXN-ABC-123",
      status: "COMPLETE",
    };
    const signedFieldNames = ["total_amount", "transaction_uuid", "product_code"];
    fields.signed_field_names = signedFieldNames.join(",");
    fields.signature = signFields(fields, signedFieldNames);

    const response = await request(app)
      .post("/api/v1/esewa/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId, data: encodeEsewaData(fields) });

    expect(response.status).toBe(200);
    expect(response.body.responseData.verified).toBe(true);

    const stored = await OrderModel.findById(order._id);
    expect(stored!.status).toBe("paid");
    expect(stored!.esewaTransactionId).toBe("TXN-ABC-123");
  });
});
