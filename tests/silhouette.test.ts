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
});
