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

describe("GET /api/v1/home/wardrobe", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/home/wardrobe");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/home/wardrobe", () => {
  test("adds a wardrobe item and it shows up in the list", async () => {
    const { token } = await createRegularUserAndToken();

    const addResponse = await request(app)
      .post("/api/v1/home/wardrobe")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Weekend Look", category: "Casual" });

    expect(addResponse.status).toBe(200);
    expect(addResponse.body.responseData.title).toBe("Weekend Look");
    expect(addResponse.body.responseData.id).toBeTruthy();

    const listResponse = await request(app)
      .get("/api/v1/home/wardrobe")
      .set("Authorization", `Bearer ${token}`);
    expect(listResponse.body.responseData).toHaveLength(1);
  });
});
