import { SilhouetteModel } from "../../src/models/silhouette.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("SilhouetteModel", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("Silhouette creation", () => {
    test("should create silhouette with valid data", async () => {
      const silhouetteData = {
        userId: "user123",
        bodyType: "hourglass",
        height: 170,
        weight: 65,
        completed: true,
      };

      const silhouette = await SilhouetteModel.create(silhouetteData);

      expect(silhouette.userId).toBe(silhouetteData.userId);
      expect(silhouette.bodyType).toBe(silhouetteData.bodyType);
      expect(silhouette.height).toBe(silhouetteData.height);
      expect(silhouette.weight).toBe(silhouetteData.weight);
      expect(silhouette.completed).toBe(silhouetteData.completed);
    });

    test("should require userId field", async () => {
      const silhouetteData = {
        bodyType: "hourglass",
        height: 170,
        weight: 65,
      };

      await expect(SilhouetteModel.create(silhouetteData as any)).rejects.toThrow();
    });
  });

  describe("Silhouette validation", () => {
    test("should enforce unique userId", async () => {
      const silhouetteData = {
        userId: "user123",
        bodyType: "hourglass",
        height: 170,
        weight: 65,
      };

      await SilhouetteModel.create(silhouetteData);
      await expect(SilhouetteModel.create(silhouetteData)).rejects.toThrow();
    });
  });
});
