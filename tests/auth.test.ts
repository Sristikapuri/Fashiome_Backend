import request from "supertest";
import bcryptjs from "bcryptjs";


const mockSendPasswordReset = jest.fn(async (_to: string, _resetLink: string) => true);
jest.mock("../src/services/email.service", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendPasswordReset: mockSendPasswordReset,
    sendOrderConfirmation: jest.fn(async () => true),
  })),
}));

import app from "../src/app";
import { UserModel } from "../src/models/user.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createUser, uniqueEmail } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
  mockSendPasswordReset.mockClear();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

function registerPayload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Ava",
    lastName: "Stylist",
    username: `authtest${Date.now()}`,
    email: uniqueEmail(),
    gender: "female",
    age: 27,
    password: "Passw0rd!",
    ...overrides,
  };
}

/** Pulls the plaintext reset code out of the (mocked) email's reset link. */
function extractResetTokenFromMock(): string {
  const [, resetLink] = mockSendPasswordReset.mock.calls[0];
  const token = new URL(resetLink).searchParams.get("token");
  if (!token) throw new Error("reset link did not contain a token");
  return token;
}

describe("POST /api/v1/auth/register", () => {
  test("registers a new user and returns a sanitized user (no password field)", async () => {
    const payload = registerPayload();

    const response = await request(app).post("/api/v1/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.isSuccess).toBe(true);
    expect(response.body.responseData.email).toBe(payload.email);
    expect(response.body.responseData.password).toBeUndefined();

    const stored = await UserModel.findOne({ email: payload.email });
    expect(stored).not.toBeNull();
    expect(stored!.password).not.toBe(payload.password);
    await expect(bcryptjs.compare(payload.password, stored!.password)).resolves.toBe(true);
  });

  test("rejects a duplicate email with 400", async () => {
    const payload = registerPayload();
    await request(app).post("/api/v1/auth/register").send(payload);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registerPayload({ email: payload.email, username: `other${Date.now()}` }));

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/already registered/i);
  });

  test("rejects a duplicate username with 400", async () => {
    const payload = registerPayload();
    await request(app).post("/api/v1/auth/register").send(payload);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registerPayload({ username: payload.username, email: uniqueEmail() }));

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/username is already taken/i);
  });

  test("rejects a Zod validation failure (invalid email, short password) with 400 and field-level errors", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registerPayload({ email: "not-an-email", password: "123" }));

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toBe("Validation failed");
    expect(Array.isArray(response.body.responseData.errors)).toBe(true);
    expect(response.body.responseData.errors.length).toBeGreaterThan(0);
  });
});

describe("POST /api/v1/auth/login", () => {
  test("logs in with valid credentials and returns a usable JWT", async () => {
    const { plainPassword, user } = await createUser({ email: uniqueEmail(), password: "Passw0rd!" });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: plainPassword });

    expect(response.status).toBe(200);
    expect(response.body.isSuccess).toBe(true);
    expect(typeof response.body.responseData.token).toBe("string");
    expect(response.body.responseData.user.email).toBe(user.email);
    expect(response.body.responseData.user.password).toBeUndefined();

    const whoami = await request(app)
      .get("/api/v1/auth/whoami")
      .set("Authorization", `Bearer ${response.body.responseData.token}`);
    expect(whoami.status).toBe(200);
    expect(whoami.body.responseData.email).toBe(user.email);
  });

  test("rejects the wrong password with 400", async () => {
    const { user } = await createUser({ password: "Passw0rd!" });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "totally-wrong" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/invalid credentials/i);
  });

  test("rejects a login for an email that isn't registered with 400", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: uniqueEmail("nobody"), password: "Passw0rd!" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/invalid credentials/i);
  });

  test("rejects a Zod validation failure (missing password) with 400", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: uniqueEmail() });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toBe("Authentication validation failed");
    expect(Array.isArray(response.body.responseData.errors)).toBe(true);
  });
});

describe("GET /api/v1/auth/whoami (JWT authentication)", () => {
  test("rejects a request with no Authorization header", async () => {
    const response = await request(app).get("/api/v1/auth/whoami");

    expect(response.status).toBe(401);
    expect(response.body.isSuccess).toBe(false);
  });
});

describe("Forgot / reset password", () => {
  test("rejects a forgot-password request with no email with 400", async () => {
    const response = await request(app).post("/api/v1/auth/forgot-password").send({});
    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/email address is required/i);
  });

  test("returns success (without leaking existence) for an email that isn't registered", async () => {
    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: uniqueEmail("nobody") });

    expect(response.status).toBe(200);
    expect(response.body.isSuccess).toBe(true);
    expect(mockSendPasswordReset).not.toHaveBeenCalled();
  });

  test("returns 503 and clears the OTP when the email service fails to send", async () => {
    mockSendPasswordReset.mockResolvedValueOnce(false);
    const { user } = await createUser();

    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: user.email });

    expect(response.status).toBe(503);
    const stored = await UserModel.findById(user._id);
    expect(stored!.resetPasswordOTP).toBeUndefined();
  });

  test("rejects a reset-password request missing required fields with 400", async () => {
    const response = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ email: uniqueEmail() });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/required/i);
  });

  test("rejects a reset-password request with a too-short new password with 400", async () => {
    const { user } = await createUser();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: user.email });
    const resetToken = extractResetTokenFromMock();

    const response = await request(app).post("/api/v1/auth/reset-password").send({
      email: user.email,
      token: resetToken,
      password: "abc",
    });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/at least 6 characters/i);
  });

  test("rejects a reset-password request with an invalid/expired code with 400", async () => {
    const { user } = await createUser();

    const response = await request(app).post("/api/v1/auth/reset-password").send({
      email: user.email,
      token: "000000",
      password: "BrandNewPass1!",
    });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/invalid or expired reset code/i);
  });

  test("reset-password with the emailed code updates the password so the old one no longer works", async () => {
    const { user, plainPassword } = await createUser();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: user.email });
    const resetToken = extractResetTokenFromMock();

    const resetResponse = await request(app).post("/api/v1/auth/reset-password").send({
      email: user.email,
      token: resetToken,
      password: "BrandNewPass1!",
    });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.isSuccess).toBe(true);

    const oldLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: plainPassword });
    expect(oldLogin.status).toBe(400);

    const newLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "BrandNewPass1!" });
    expect(newLogin.status).toBe(200);
  });
});
