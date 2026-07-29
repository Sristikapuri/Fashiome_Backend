import request from "supertest";
import app from "../src/app";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createRegularUserAndToken } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

describe("POST /api/v1/silhouette/profile", () => {
  test("creates a silhouette profile with the submitted measurements", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .post("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ bodyType: "hourglass", height: 165, weight: 58, skinTone: "olive" });

    expect(response.status).toBe(200);
    expect(response.body.responseData).toMatchObject({
      bodyType: "hourglass",
      height: 165,
      weight: 58,
      skinTone: "olive",
      completed: true,
    });
  });

  test("updates an existing silhouette profile on a second save", async () => {
    const { token } = await createRegularUserAndToken();

    await request(app)
      .post("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ bodyType: "hourglass", height: 165, weight: 58, skinTone: "olive" });

    const response = await request(app)
      .post("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ bodyType: "pear", height: 170, weight: 60, skinTone: "fair" });

    expect(response.status).toBe(200);
    expect(response.body.responseData).toMatchObject({
      bodyType: "pear",
      height: 170,
      weight: 60,
      skinTone: "fair",
      completed: true,
    });
  });

  test("rejects requests with no token (401)", async () => {
    const response = await request(app)
      .post("/api/v1/silhouette/profile")
      .send({ bodyType: "hourglass" });

    expect(response.status).toBe(401);
    expect(response.body.isSuccess).toBe(false);
  });
});

describe("GET /api/v1/silhouette/profile", () => {
  test("creates and returns a default (not-yet-completed) profile on first access", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .get("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.completed).toBe(false);
  });

  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/silhouette/profile");
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/v1/silhouette/profile", () => {
  test("clears an existing silhouette profile", async () => {
    const { token } = await createRegularUserAndToken();
    await request(app)
      .post("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ bodyType: "hourglass", height: 165, weight: 58, skinTone: "olive" });

    const response = await request(app)
      .delete("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.isSuccess).toBe(true);

    const getResponse = await request(app)
      .get("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(getResponse.body.responseData.completed).toBe(false);
  });

  test("returns 404 when no silhouette profile exists yet for the user", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .delete("/api/v1/silhouette/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.isSuccess).toBe(false);
  });

  test("rejects requests with no token (401)", async () => {
    const response = await request(app).delete("/api/v1/silhouette/profile");
    expect(response.status).toBe(401);
  });
});
