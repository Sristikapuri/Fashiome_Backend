import request from "supertest";
import app from "../src/app";
import { ClothesModel, type ClothingCategory } from "../src/models/clothes.model";
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
    name: "Denim Jacket",
    category: "outerwear",
    size: "L",
    color: "Blue",
    price: 60,
    stock: 5,
    status: "active",
    ...overrides,
  };
}

describe("GET /api/v1/cart", () => {
  test("rejects requests with no token (401)", async () => {
    const response = await request(app).get("/api/v1/cart");
    expect(response.status).toBe(401);
  });

  test("returns an empty cart for a user who hasn't added anything", async () => {
    const { token } = await createRegularUserAndToken();

    const response = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData.items).toEqual([]);
  });
});

describe("PUT /api/v1/cart", () => {
  test("sets the cart with valid items", async () => {
    const { token } = await createRegularUserAndToken();
    const item = await ClothesModel.create(clothePayload());

    const response = await request(app)
      .put("/api/v1/cart")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ clotheId: item._id.toString(), quantity: 2 }] });

    expect(response.status).toBe(200);
    expect(response.body.responseData.items).toHaveLength(1);
    expect(response.body.responseData.items[0].quantity).toBe(2);
  });

  test("a subsequent GET returns the cart enriched with the clothes item details", async () => {
    const { token } = await createRegularUserAndToken();
    const item = await ClothesModel.create(clothePayload());

    await request(app)
      .put("/api/v1/cart")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ clotheId: item._id.toString(), quantity: 3 }] });

    const response = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);

    expect(response.body.responseData.items).toHaveLength(1);
    expect(response.body.responseData.items[0].quantity).toBe(3);
    expect(response.body.responseData.items[0].clothe.name).toBe("Denim Jacket");
  });
});
