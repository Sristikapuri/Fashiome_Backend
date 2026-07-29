import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { ClothesModel, type ClothingCategory } from "../src/models/clothes.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createAdminAndToken, createRegularUserAndToken } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

type ClothePayload = {
  name: string;
  category: ClothingCategory;
  size: string;
  color: string;
  price: number;
  stock: number;
  status: "active" | "inactive";
};

function clothePayload(overrides: Partial<ClothePayload> = {}): ClothePayload {
  return {
    name: "Silk Blazer",
    category: "outerwear",
    size: "M",
    color: "Beige",
    price: 89.99,
    stock: 12,
    status: "active",
    ...overrides,
  };
}

describe("Admin clothes — authorization", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/admin/clothes");
    expect(response.status).toBe(401);
    expect(response.body.isSuccess).toBe(false);
  });

  test("rejects a non-admin user with 403", async () => {
    const { token } = await createRegularUserAndToken();
    const response = await request(app)
      .get("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });
});

describe("GET /api/v1/admin/clothes", () => {
  test("returns paginated clothes with default pagination", async () => {
    const { token } = await createAdminAndToken();
    await ClothesModel.create(clothePayload());
    await ClothesModel.create(clothePayload({ name: "Denim Jacket" }));

    const response = await request(app)
      .get("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.responseData.meta).toMatchObject({ page: 1, limit: 10 });
  });

  test("filters clothes by search, category, and status", async () => {
    const { token } = await createAdminAndToken();
    await ClothesModel.create(clothePayload({ name: "Silk Blazer", category: "outerwear", status: "active" }));
    await ClothesModel.create(clothePayload({ name: "Cotton Tee", category: "tops", status: "inactive" }));

    const response = await request(app)
      .get("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`)
      .query({ search: "Blazer", category: "outerwear", status: "active" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.data).toHaveLength(1);
    expect(response.body.responseData.data[0].name).toBe("Silk Blazer");
  });

  test("rejects an invalid page query parameter with 400", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .get("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`)
      .query({ page: "abc" });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/admin/clothes/:id", () => {
  test("returns a single clothes item", async () => {
    const { token } = await createAdminAndToken();
    const item = await ClothesModel.create(clothePayload());

    const response = await request(app)
      .get(`/api/v1/admin/clothes/${item._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.name).toBe("Silk Blazer");
  });

  test("returns 404 for an item that does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .get(`/api/v1/admin/clothes/${missingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});

describe("GET /api/v1/admin/clothes/low-stock", () => {
  test("returns items at or below the default threshold", async () => {
    const { token } = await createAdminAndToken();
    await ClothesModel.create(clothePayload({ name: "Low Stock Item", stock: 2 }));
    await ClothesModel.create(clothePayload({ name: "Plenty In Stock", stock: 50 }));

    const response = await request(app)
      .get("/api/v1/admin/clothes/low-stock")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.some((i: { name: string }) => i.name === "Low Stock Item")).toBe(true);
    expect(response.body.responseData.some((i: { name: string }) => i.name === "Plenty In Stock")).toBe(false);
  });

  test("honors a custom threshold query parameter", async () => {
    const { token } = await createAdminAndToken();
    await ClothesModel.create(clothePayload({ name: "Mid Stock Item", stock: 20 }));

    const response = await request(app)
      .get("/api/v1/admin/clothes/low-stock")
      .set("Authorization", `Bearer ${token}`)
      .query({ threshold: 25 });

    expect(response.status).toBe(200);
    expect(response.body.responseData.some((i: { name: string }) => i.name === "Mid Stock Item")).toBe(true);
  });
});

describe("POST /api/v1/admin/clothes (create)", () => {
  test("creates a clothes item as admin", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .post("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`)
      .send(clothePayload());

    expect(response.status).toBe(201);
    expect(response.body.isSuccess).toBe(true);
    expect(response.body.responseData.name).toBe("Silk Blazer");
    expect(response.body.responseData.price).toBe(89.99);

    const stored = await ClothesModel.findById(response.body.responseData._id);
    expect(stored).not.toBeNull();
  });

  test("rejects a Zod validation failure (missing required fields) with 400", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .post("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Incomplete Item" });

    expect(response.status).toBe(400);
    expect(response.body.responseMessage).toBe("Validation failed");
    expect(Array.isArray(response.body.responseData.errors)).toBe(true);
  });

  test("rejects an unknown category with 400", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .post("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`)
      .send(clothePayload({ category: "not-a-category" as unknown as ClothePayload["category"] }));

    expect(response.status).toBe(400);
  });

  test("sets discountedPrice to null when it is submitted as an empty string", async () => {
    const { token } = await createAdminAndToken();

    const response = await request(app)
      .post("/api/v1/admin/clothes")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...clothePayload(), discountedPrice: "" });

    expect(response.status).toBe(201);
    expect(response.body.responseData.discountedPrice).toBeNull();
  });
});

describe("PUT /api/v1/admin/clothes/:id (update)", () => {
  test("updates an existing item", async () => {
    const { token } = await createAdminAndToken();
    const item = await ClothesModel.create(clothePayload());

    const response = await request(app)
      .put(`/api/v1/admin/clothes/${item._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 150, stock: 3, status: "inactive" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.price).toBe(150);
    expect(response.body.responseData.stock).toBe(3);
    expect(response.body.responseData.status).toBe("inactive");
  });

  test("returns 404 when updating an item that does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .put(`/api/v1/admin/clothes/${missingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 10 });

    expect(response.status).toBe(404);
  });

  test("rejects a Zod validation failure (negative price) with 400", async () => {
    const { token } = await createAdminAndToken();
    const item = await ClothesModel.create(clothePayload());

    const response = await request(app)
      .put(`/api/v1/admin/clothes/${item._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: -5 });

    expect(response.status).toBe(400);
  });

  test("clears discountedPrice back to null when set to the string 'null'", async () => {
    const { token } = await createAdminAndToken();
    const item = await ClothesModel.create({ ...clothePayload(), discountedPrice: 50 });

    const response = await request(app)
      .put(`/api/v1/admin/clothes/${item._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ discountedPrice: "null" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.discountedPrice).toBeNull();
  });
});

describe("DELETE /api/v1/admin/clothes/:id", () => {
  test("deletes an existing item", async () => {
    const { token } = await createAdminAndToken();
    const item = await ClothesModel.create(clothePayload());

    const response = await request(app)
      .delete(`/api/v1/admin/clothes/${item._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await ClothesModel.findById(item._id)).toBeNull();
  });

  test("returns 404 when deleting an item that does not exist", async () => {
    const { token } = await createAdminAndToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .delete(`/api/v1/admin/clothes/${missingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
