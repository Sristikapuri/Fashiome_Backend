import { SilhouetteMongoRepository } from "../../src/repositories/silhouette.repository";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("SilhouetteMongoRepository", () => {
  let repository: SilhouetteMongoRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new SilhouetteMongoRepository();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("create", () => {
    test("should create new silhouette", async () => {
      const silhouetteData = {
        userId: "user123",
        bodyType: "hourglass",
        height: 170,
        weight: 65,
      };

      const silhouette = await repository.create(silhouetteData);

      expect(silhouette.userId).toBe(silhouetteData.userId);
      expect(silhouette.bodyType).toBe(silhouetteData.bodyType);
    });
  });
});
