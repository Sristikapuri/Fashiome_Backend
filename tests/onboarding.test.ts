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

  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/onboarding/status");
    expect(response.status).toBe(401);
    expect(response.body.isSuccess).toBe(false);
  });

  test("returns the same onboarding record on a second access instead of recreating it", async () => {
    const { token } = await createRegularUserAndToken();

    const first = await request(app)
      .get("/api/v1/onboarding/status")
      .set("Authorization", `Bearer ${token}`);
    const second = await request(app)
      .get("/api/v1/onboarding/status")
      .set("Authorization", `Bearer ${token}`);

    expect(first.body.responseData._id).toBe(second.body.responseData._id);
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

  test("rejects requests with no token (401)", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/complete")
      .send({ preferences: { style: "minimal" } });
    expect(response.status).toBe(401);
  });

  test("returns 404 when no onboarding record exists yet for the user", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app)
      .post("/api/v1/onboarding/complete")
      .set("Authorization", `Bearer ${token}`)
      .send({ preferences: { style: "minimal", size: "M", color: "black" } });

    expect(response.status).toBe(404);
    expect(response.body.isSuccess).toBe(false);
  });

  test("returns 400 when onboarding has already been completed", async () => {
    const { token } = await createRegularUserAndToken();
    await request(app).get("/api/v1/onboarding/status").set("Authorization", `Bearer ${token}`);
    await request(app)
      .post("/api/v1/onboarding/complete")
      .set("Authorization", `Bearer ${token}`)
      .send({ preferences: { style: "minimal", size: "M", color: "black" } });

    const response = await request(app)
      .post("/api/v1/onboarding/complete")
      .set("Authorization", `Bearer ${token}`)
      .send({ preferences: { style: "minimal", size: "M", color: "black" } });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/already completed/i);
  });

  test("falls back to the existing preferences when none are supplied in the request body", async () => {
    const { token } = await createRegularUserAndToken();
    await request(app).get("/api/v1/onboarding/status").set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .post("/api/v1/onboarding/complete")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.responseData.completed).toBe(true);
  });
});
