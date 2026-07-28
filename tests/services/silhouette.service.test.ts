import { SilhouetteService } from "../../src/services/silhouette.service";
import { SilhouetteMongoRepository } from "../../src/repositories/silhouette.repository";

describe("SilhouetteService", () => {
  let service: SilhouetteService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new SilhouetteService();
  });

  describe("saveSilhouetteProfile", () => {
    test("creates the profile when it does not exist yet", async () => {
      const userId = "user123";
      const profileData = { bodyType: "hourglass" };
      const created = { _id: "silhouette1", userId, ...profileData, completed: true };
      jest.spyOn(SilhouetteMongoRepository.prototype, "getByUserId").mockResolvedValue(null);
      const createSpy = jest
        .spyOn(SilhouetteMongoRepository.prototype, "create")
        .mockResolvedValue(created as any);

      const result = await service.saveSilhouetteProfile(userId, profileData);
      expect(result).toEqual(created);
      expect(createSpy).toHaveBeenCalledWith({ userId, ...profileData, completed: true });
    });
  });
});
