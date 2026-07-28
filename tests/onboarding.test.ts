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

describe("GET /api/v1/onboarding/status", () => {
  test("creates and returns a default onboarding record on first access", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .get("/api/v1/onboarding/status")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.isSuccess).toBe(true);
    expect(response.body.responseData.completed).toBe(false);
  });
});

describe("POST /api/v1/onboarding/complete", () => {
  test("completes onboarding with preferences after a status record exists", async () => {
    const { token } = await createRegularUserAndToken();
    await request(app).get("/api/v1/onboarding/status").set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .post("/api/v1/onboarding/complete")
      .set("Authorization", `Bearer ${token}`)
      .send({ preferences: { style: "minimal", size: "M", color: "black" } });

    expect(response.status).toBe(200);
    expect(response.body.responseData.completed).toBe(true);
    expect(response.body.responseData.completedAt).toBeTruthy();
    expect(response.body.responseData.preferences).toMatchObject({
      style: "minimal",
      size: "M",
      color: "black",
    });
  });
});
