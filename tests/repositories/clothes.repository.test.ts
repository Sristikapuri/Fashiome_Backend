import { ClothesMongoRepository } from "../../src/repositories/clothes.repository";
import { ClothesModel, ClothingCategory, ClothingGender } from "../../src/models/clothes.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("ClothesMongoRepository", () => {
  let repository: ClothesMongoRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new ClothesMongoRepository();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("create", () => {
    test("should create new clothes", async () => {
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

      const clothes = await repository.create(clothesData);

      expect(clothes.name).toBe(clothesData.name);
      expect(clothes.category).toBe(clothesData.category);
    });
  });

  describe("getPaginated", () => {
    test("should return paginated results", async () => {
      for (let i = 0; i < 15; i++) {
        await ClothesModel.create({
          name: `Item ${i}`,
          category: "tops" as ClothingCategory,
          gender: "unisex" as ClothingGender,
          size: "M",
          color: "blue",
          price: 29.99,
          stock: 10,
          imageUrl: `item${i}.jpg`,
          description: `Item ${i}`,
          status: "active" as const,
        });
      }

      const result = await repository.getPaginated(1, 10, undefined, undefined, undefined);
      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(15);
    });
  });
});
