import { OnboardingModel } from "../../src/models/onboarding.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("OnboardingModel", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("Onboarding creation", () => {
    test("should create onboarding with valid data", async () => {
      const onboardingData = {
        userId: "user123",
        completed: true,
        preferences: {
          style: "casual",
          size: "M",
          color: "blue",
        },
      };

      const onboarding = await OnboardingModel.create(onboardingData);

      expect(onboarding.userId).toBe(onboardingData.userId);
      expect(onboarding.completed).toBe(onboardingData.completed);
      expect(onboarding.preferences?.style).toBe(onboardingData.preferences.style);
      expect(onboarding.preferences?.size).toBe(onboardingData.preferences.size);
      expect(onboarding.preferences?.color).toBe(onboardingData.preferences.color);
    });

    test("should require userId field", async () => {
      const onboardingData = {
        preferences: {
          style: "casual",
          size: "M",
          color: "blue",
        },
      };

      await expect(OnboardingModel.create(onboardingData as any)).rejects.toThrow();
    });
  });
});
