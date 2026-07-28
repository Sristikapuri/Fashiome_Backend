import request from "supertest";
import app from "../src/app";
import { ClothesModel, type ClothingCategory } from "../src/models/clothes.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";

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
    name: "Cotton Shirt",
    category: "shirts",
    size: "M",
    color: "White",
    price: 45,
    stock: 10,
    status: "active",
    ...overrides,
  };
}

describe("GET /api/v1/home/clothes (public catalog)", () => {
  test("does not require authentication", async () => {
    const response = await request(app).get("/api/v1/home/clothes");
    expect(response.status).toBe(200);
  });
});

describe("GET /api/v1/home/clothes/:id", () => {
  test("returns an active item by id", async () => {
    const item = await ClothesModel.create(clothePayload());

    const response = await request(app).get(`/api/v1/home/clothes/${item._id}`);

    expect(response.status).toBe(200);
    expect(response.body.responseData._id).toBe(item._id.toString());
  });
});
