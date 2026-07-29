import request from "supertest";
import mongoose from "mongoose";
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

  test("rejects requests with no token (401)", async () => {
    const clothe = await createClothe();
    const response = await request(app)
      .post("/api/v1/reviews")
      .send({ clotheId: clothe._id.toString(), rating: 5, comment: "Nice" });
    expect(response.status).toBe(401);
  });

  test("rejects a request missing required fields with 400", async () => {
    const { token } = await createRegularUserAndToken();
    const clothe = await createClothe();

    const response = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ clotheId: clothe._id.toString() });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/required/i);
  });

  test("rejects a rating outside 1-5 with 400", async () => {
    const { token } = await createRegularUserAndToken();
    const clothe = await createClothe();

    const response = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ clotheId: clothe._id.toString(), rating: 7, comment: "Too high" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/between 1 and 5/i);
  });

  test("rejects a second review for the same clothe by the same user with 400", async () => {
    const { token } = await createRegularUserAndToken();
    const clothe = await createClothe();

    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ clotheId: clothe._id.toString(), rating: 4, comment: "First review" });

    const response = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({ clotheId: clothe._id.toString(), rating: 3, comment: "Second review" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/already reviewed/i);
  });
});

describe("GET /api/v1/reviews/my", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/reviews/my");
    expect(response.status).toBe(401);
  });

  test("returns only the requesting user's reviews", async () => {
    const clothe = await createClothe();
    const { token: userA } = await createRegularUserAndToken();
    const { token: userB } = await createRegularUserAndToken();

    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${userA}`)
      .send({ clotheId: clothe._id.toString(), rating: 5, comment: "From A" });
    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${userB}`)
      .send({ clotheId: clothe._id.toString(), rating: 3, comment: "From B" });

    const response = await request(app)
      .get("/api/v1/reviews/my")
      .set("Authorization", `Bearer ${userA}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData).toHaveLength(1);
    expect(response.body.responseData[0].comment).toBe("From A");
  });
});

describe("PUT /api/v1/reviews/:id", () => {
  test("allows the review's owner to update it", async () => {
    const clothe = await createClothe();
    const { token: owner } = await createRegularUserAndToken();
    const createResponse = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${owner}`)
      .send({ clotheId: clothe._id.toString(), rating: 3, comment: "Original" });
    const reviewId = createResponse.body.responseData._id;

    const response = await request(app)
      .put(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ rating: 5, comment: "Updated after washing" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.rating).toBe(5);
    expect(response.body.responseData.comment).toBe("Updated after washing");
  });

  test("rejects updates from a user who does not own the review with 403", async () => {
    const clothe = await createClothe();
    const { token: owner } = await createRegularUserAndToken();
    const { token: intruder } = await createRegularUserAndToken();
    const createResponse = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${owner}`)
      .send({ clotheId: clothe._id.toString(), rating: 3, comment: "Original" });
    const reviewId = createResponse.body.responseData._id;

    const response = await request(app)
      .put(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${intruder}`)
      .send({ rating: 1, comment: "Trying to sabotage" });

    expect(response.status).toBe(403);
  });

  test("returns 404 when updating a review that does not exist", async () => {
    const { token } = await createRegularUserAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .put(`/api/v1/reviews/${missingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 4 });

    expect(response.status).toBe(404);
  });

  test("rejects an out-of-range rating on update with 400", async () => {
    const clothe = await createClothe();
    const { token: owner } = await createRegularUserAndToken();
    const createResponse = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${owner}`)
      .send({ clotheId: clothe._id.toString(), rating: 3, comment: "Original" });
    const reviewId = createResponse.body.responseData._id;

    // Note: `rating: 0` would bypass this check entirely (the controller's
    // `if (rating && ...)` guard treats 0 as falsy), so use a too-high value
    // instead to actually exercise the "out of range" branch.
    const response = await request(app)
      .put(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ rating: 8 });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toMatch(/between 1 and 5/i);
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

  test("rejects requests with no token (401)", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const response = await request(app).delete(`/api/v1/reviews/${missingId}`);
    expect(response.status).toBe(401);
  });

  test("rejects deletion from a user who does not own the review with 403", async () => {
    const clothe = await createClothe();
    const { token: owner } = await createRegularUserAndToken();
    const { token: intruder } = await createRegularUserAndToken();
    const createResponse = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${owner}`)
      .send({ clotheId: clothe._id.toString(), rating: 4, comment: "Original" });
    const reviewId = createResponse.body.responseData._id;

    const response = await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${intruder}`);

    expect(response.status).toBe(403);
  });

  test("returns 404 when deleting a review that does not exist", async () => {
    const { token } = await createRegularUserAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .delete(`/api/v1/reviews/${missingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
