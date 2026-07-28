import { ClothesModel, ClothingCategory, ClothingGender } from "../../src/models/clothes.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("ClothesModel", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("Clothes creation", () => {
    test("should create clothes with valid data", async () => {
      const clothesData = {
        name: "Test Shirt",
        category: "tops" as ClothingCategory,
        gender: "male" as ClothingGender,
        size: "M",
        color: "blue",
        price: 29.99,
        stock: 10,
        imageUrl: "test.jpg",
        description: "A test shirt",
        status: "active" as const,
      };

      const clothes = await ClothesModel.create(clothesData);

      expect(clothes.name).toBe(clothesData.name);
      expect(clothes.category).toBe(clothesData.category);
      expect(clothes.gender).toBe(clothesData.gender);
      expect(clothes.size).toBe(clothesData.size);
      expect(clothes.color).toBe(clothesData.color);
      expect(clothes.price).toBe(clothesData.price);
      expect(clothes.stock).toBe(clothesData.stock);
    });

    test("should require name field", async () => {
      const clothesData = {
        category: "tops" as ClothingCategory,
        gender: "male" as ClothingGender,
        size: "M",
        color: "blue",
        price: 29.99,
        stock: 10,
      };

      await expect(ClothesModel.create(clothesData as any)).rejects.toThrow();
    });

    test("should enforce minimum price of 0", async () => {
      const clothesData = {
        name: "Test Shirt",
        category: "tops" as ClothingCategory,
        gender: "male" as ClothingGender,
        size: "M",
        color: "blue",
        price: -10,
        stock: 10,
      };

      await expect(ClothesModel.create(clothesData as any)).rejects.toThrow();
    });
  });
});
