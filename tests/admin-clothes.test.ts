import request from "supertest";
import app from "../src/app";
import { ClothesModel, type ClothingCategory } from "../src/models/clothes.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createAdminAndToken } from "./setup/helpers";

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
});
