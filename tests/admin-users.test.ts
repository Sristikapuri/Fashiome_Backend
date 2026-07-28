import request from "supertest";
import app from "../src/app";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createAdminAndToken, uniqueEmail } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

function adminUserPayload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Nina",
    lastName: "Wardrobe",
    email: uniqueEmail("admin-created"),
    username: `admincreated${Date.now()}`,
    password: "Passw0rd!",
    gender: "female",
    age: 30,
    role: "user",
    status: "active",
    ...overrides,
  };
}

describe("Admin users — authorization", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/admin/users");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/admin/users (create)", () => {
  test("creates a user as admin and never returns the password field", async () => {
    const { token } = await createAdminAndToken();
    const payload = adminUserPayload();

    const response = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.responseData.email).toBe(payload.email);
    expect(response.body.responseData.password).toBeUndefined();
  });
});
