import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { UserModel } from "../src/models/user.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createAdminAndToken, createRegularUserAndToken, createUser, uniqueEmail } from "./setup/helpers";

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

  test("rejects a non-admin user with 403", async () => {
    const { token } = await createRegularUserAndToken();
    const response = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });
});

describe("GET /api/v1/admin/users", () => {
  test("returns paginated users", async () => {
    const { token } = await createAdminAndToken();
    await createUser();
    await createUser();

    const response = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.responseData.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.responseData.meta).toMatchObject({ page: 1, limit: 10 });
    response.body.responseData.data.forEach((u: { password?: string }) =>
      expect(u.password).toBeUndefined()
    );
  });

  test("rejects an invalid page query parameter with 400", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .query({ page: "not-a-number" });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/admin/users/:id", () => {
  test("returns a single user by id", async () => {
    const { token } = await createAdminAndToken();
    const { user } = await createUser();

    const response = await request(app)
      .get(`/api/v1/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.email).toBe(user.email);
  });

  test("returns 404 for a user id that does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .get(`/api/v1/admin/users/${missingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
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

  test("rejects a Zod validation failure (missing required fields) with 400", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: adminUserPayload().email });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toBe("Validation failed");
  });

  test("rejects a duplicate email with 400", async () => {
    const { token } = await createAdminAndToken();
    const payload = adminUserPayload();
    await request(app).post("/api/v1/admin/users").set("Authorization", `Bearer ${token}`).send(payload);

    const response = await request(app)
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send(adminUserPayload({ email: payload.email, username: `dup${Date.now()}` }));

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/already registered/i);
  });
});

describe("PUT /api/v1/admin/users/:id (update)", () => {
  test("updates an existing user's fields", async () => {
    const { token } = await createAdminAndToken();
    const { user } = await createUser();

    const response = await request(app)
      .put(`/api/v1/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Renamed", status: "inactive" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.firstName).toBe("Renamed");
    expect(response.body.responseData.status).toBe("inactive");
  });

  test("returns 404 when updating a user that does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .put(`/api/v1/admin/users/${missingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Ghost" });

    expect(response.status).toBe(404);
  });

  test("rejects a Zod validation failure (invalid email) with 400", async () => {
    const { token } = await createAdminAndToken();
    const { user } = await createUser();

    const response = await request(app)
      .put(`/api/v1/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/v1/admin/users/:id", () => {
  test("deletes an existing user", async () => {
    const { token } = await createAdminAndToken();
    const { user } = await createUser();

    const response = await request(app)
      .delete(`/api/v1/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await UserModel.findById(user._id)).toBeNull();
  });

  test("returns 404 when deleting a user that does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .delete(`/api/v1/admin/users/${missingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
