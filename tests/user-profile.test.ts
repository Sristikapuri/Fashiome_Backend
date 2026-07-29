import request from "supertest";
import app from "../src/app";
import { UserModel } from "../src/models/user.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createRegularUserAndToken, createUser } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

describe("GET /api/v1/auth/whoami", () => {
  test("returns the logged-in user's sanitized profile", async () => {
    const { token, user } = await createRegularUserAndToken();

    const response = await request(app)
      .get("/api/v1/auth/whoami")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.email).toBe(user.email);
    expect(response.body.responseData.password).toBeUndefined();
  });
});

describe("PUT /api/v1/users/update", () => {
  test("updates the logged-in user's profile and returns it without the password field", async () => {
    const { token, user } = await createRegularUserAndToken({ firstName: "Old" });

    const response = await request(app)
      .put("/api/v1/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Updated" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.firstName).toBe("Updated");
    expect(response.body.responseData.password).toBeUndefined();

    const stored = await UserModel.findById(user._id);
    expect(stored!.firstName).toBe("Updated");
  });

  test("rejects requests with no token (401)", async () => {
    const response = await request(app).put("/api/v1/users/update").send({ firstName: "X" });
    expect(response.status).toBe(401);
  });

  test("rejects a Zod validation failure (invalid email) with 400", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .put("/api/v1/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toBe("Validation failed");
  });

  test("rejects updating to an email already used by another account with 400", async () => {
    const { user: otherUser } = await createUser();
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .put("/api/v1/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: otherUser.email });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/already registered/i);
  });

  test("coerces a numeric-string age field to a number", async () => {
    const { token, user } = await createRegularUserAndToken();

    const response = await request(app)
      .put("/api/v1/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ age: "42" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.age).toBe(42);

    const stored = await UserModel.findById(user._id);
    expect(stored!.age).toBe(42);
  });
});

describe("DELETE /api/v1/users/delete", () => {
  test("deletes the logged-in user's account and invalidates their token", async () => {
    const { token, user } = await createRegularUserAndToken();

    const deleteResponse = await request(app)
      .delete("/api/v1/users/delete")
      .set("Authorization", `Bearer ${token}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.isSuccess).toBe(true);

    const stored = await UserModel.findById(user._id);
    expect(stored).toBeNull();

    const whoami = await request(app)
      .get("/api/v1/auth/whoami")
      .set("Authorization", `Bearer ${token}`);
    expect(whoami.status).toBe(401);
  });

  test("rejects requests with no token (401)", async () => {
    const response = await request(app).delete("/api/v1/users/delete");
    expect(response.status).toBe(401);
  });
});

describe("GET/POST /api/v1/users/style-archive", () => {
  test("rejects requests with no token (401)", async () => {
    const getResponse = await request(app).get("/api/v1/users/style-archive");
    expect(getResponse.status).toBe(401);

    const postResponse = await request(app)
      .post("/api/v1/users/style-archive")
      .send({ weekKey: "2026-W01", day: "Mon", occasion: "Work" });
    expect(postResponse.status).toBe(401);
  });

  test("returns an empty style archive for a brand new user", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .get("/api/v1/users/style-archive")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.styleArchive).toEqual([]);
  });

  test("rejects an upsert missing weekKey/day/occasion with 400", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .post("/api/v1/users/style-archive")
      .set("Authorization", `Bearer ${token}`)
      .send({ weekKey: "2026-W01" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/required/i);
  });

  test("adds a new style archive entry and replaces an existing entry for the same week/day", async () => {
    const { token } = await createRegularUserAndToken();

    const first = await request(app)
      .post("/api/v1/users/style-archive")
      .set("Authorization", `Bearer ${token}`)
      .send({ weekKey: "2026-W01", day: "Mon", occasion: "Work", title: "Blazer look" });

    expect(first.status).toBe(200);
    expect(first.body.responseData.styleArchive).toHaveLength(1);

    const second = await request(app)
      .post("/api/v1/users/style-archive")
      .set("Authorization", `Bearer ${token}`)
      .send({ weekKey: "2026-W01", day: "Mon", occasion: "Work", title: "Updated blazer look" });

    expect(second.status).toBe(200);
    expect(second.body.responseData.styleArchive).toHaveLength(1);
    expect(second.body.responseData.styleArchive[0].title).toBe("Updated blazer look");
  });
});
