import request from "supertest";
import app from "../src/app";


describe("App smoke tests", () => {
  test("health endpoint responds", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Backend is running successfully/);
  });

  test("protected routes reject requests without a token", async () => {
    const response = await request(app).get("/api/v1/home/wardrobe");

    expect(response.status).toBe(401);
    expect(response.body.isSuccess).toBe(false);
  });
});
