import { ClothesService } from "../../src/services/clothes.service";
import { ClothesMongoRepository } from "../../src/repositories/clothes.repository";
import { IClothe } from "../../src/models/clothes.model";

describe("ClothesService", () => {
  let clothesService: ClothesService;

  beforeEach(() => {
    jest.restoreAllMocks();
    clothesService = new ClothesService();
  });

  describe("create", () => {
    test("should create a new clothing item", async () => {
      const payload = {
        name: "New Shirt",
        price: 39.99,
        category: "tops" as const,
        gender: "female" as const,
        size: "M" as const,
        color: "red",
        stock: 20,
        status: "active" as const,
        imageUrl: "",
        description: "",
      };
      const mockClothe: Partial<IClothe> = {
        _id: "123" as any,
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const createSpy = jest
        .spyOn(ClothesMongoRepository.prototype, "create")
        .mockResolvedValue(mockClothe as any);

      const result = await clothesService.create(payload);
      expect(result).toEqual(mockClothe);
      expect(createSpy).toHaveBeenCalledWith(payload);
    });
  });

  describe("getPaginated", () => {
    test("should return paginated results", async () => {
      const mockResult = {
        items: [],
        total: 0,
      };
      const getPaginatedSpy = jest
        .spyOn(ClothesMongoRepository.prototype, "getPaginated")
        .mockResolvedValue(mockResult as any);

      const result = await clothesService.getPaginated(1, 10);
      expect(result).toEqual(mockResult);
      expect(getPaginatedSpy).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined);
    });
  });
});
