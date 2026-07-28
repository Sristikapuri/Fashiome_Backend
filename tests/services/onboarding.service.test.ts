import { OnboardingService } from "../../src/services/onboarding.service";
import { OnboardingMongoRepository } from "../../src/repositories/onboarding.repository";

describe("OnboardingService", () => {
  let service: OnboardingService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new OnboardingService();
  });

  describe("getOnboardingStatus", () => {
    test("creates a default onboarding record when none exists", async () => {
      const userId = "user123";
      const created = { _id: "onboarding1", userId, completed: false };
      jest.spyOn(OnboardingMongoRepository.prototype, "getByUserId").mockResolvedValue(null);
      const createSpy = jest
        .spyOn(OnboardingMongoRepository.prototype, "create")
        .mockResolvedValue(created as any);

      const onboarding = await service.getOnboardingStatus(userId);
      expect(onboarding).toEqual(created);
      expect(createSpy).toHaveBeenCalledWith({ userId, completed: false });
    });
  });
});
