import { OnboardingMongoRepository } from "../../src/repositories/onboarding.repository";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("OnboardingMongoRepository", () => {
  let repository: OnboardingMongoRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new OnboardingMongoRepository();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("create", () => {
    test("should create new onboarding", async () => {
      const onboardingData = {
        userId: "user123",
        preferences: {
          style: "casual",
          size: "M",
          color: "blue",
        },
      };

      const onboarding = await repository.create(onboardingData);

      expect(onboarding.userId).toBe(onboardingData.userId);
      expect(onboarding.preferences?.style).toBe(onboardingData.preferences.style);
    });
  });
});
