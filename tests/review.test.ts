import request from "supertest";
import app from "../src/app";
import { ClothesModel } from "../src/models/clothes.model";
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

async function createClothe() {
  return ClothesModel.create({
    name: "Leather Boots",
    category: "shoes",
    size: "8",
    color: "Brown",
    price: 80,
    stock: 4,
    status: "active",
  });
}

describe("POST /api/v1/reviews", () => {
  test("creates a review", async () => {
    const { token } = await createRegularUserAndToken();
    const clothe = await createClothe();

    const response = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ clotheId: clothe._id.toString(), rating: 5, title: "Love them", comment: "Super comfy" });

    expect(response.status).toBe(201);
    expect(response.body.responseData.rating).toBe(5);
    expect(response.body.responseData.comment).toBe("Super comfy");
  });
});

describe("GET /api/v1/reviews/clothe/:clotheId (public)", () => {
  test("returns reviews and computed average rating", async () => {
    const clothe = await createClothe();
    const { token: userA } = await createRegularUserAndToken();
    const { token: userB } = await createRegularUserAndToken();
    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${userA}`)
      .send({ clotheId: clothe._id.toString(), rating: 4, comment: "Nice" });
    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${userB}`)
      .send({ clotheId: clothe._id.toString(), rating: 2, comment: "Meh" });

    const response = await request(app).get(`/api/v1/reviews/clothe/${clothe._id}`);

    expect(response.body.responseData.reviews).toHaveLength(2);
    expect(response.body.responseData.stats.totalReviews).toBe(2);
    expect(response.body.responseData.stats.averageRating).toBe(3);
  });
});

describe("DELETE /api/v1/reviews/:id", () => {
  test("allows the review's own owner to delete it", async () => {
    const clothe = await createClothe();
    const { token: owner } = await createRegularUserAndToken();
    const createResponse = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${owner}`)
      .send({ clotheId: clothe._id.toString(), rating: 4, comment: "Original" });
    const reviewId = createResponse.body.responseData._id;

    const deleteResponse = await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${owner}`);

    expect(deleteResponse.status).toBe(200);

    const listResponse = await request(app).get(`/api/v1/reviews/clothe/${clothe._id}`);
    expect(listResponse.body.responseData.reviews).toHaveLength(0);
  });
});
