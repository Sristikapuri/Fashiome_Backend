import { OnboardingMongoRepository } from "../repositories/onboarding.repository";
import { IOnboarding } from "../models/onboarding.model";
import { HttpException } from "../exceptions/http-exception";

const onboardingRepository = new OnboardingMongoRepository();

export class OnboardingService {
  async getOnboardingStatus(userId: string): Promise<IOnboarding> {
    let onboarding = await onboardingRepository.getByUserId(userId);
    
    if (!onboarding) {
      // Create default onboarding record if it doesn't exist
      onboarding = await onboardingRepository.create({
        userId,
        completed: false,
      });
    }
    
    return onboarding;
  }

  async completeOnboarding(userId: string, preferences?: any): Promise<IOnboarding> {
    let onboarding = await onboardingRepository.getByUserId(userId);
    
    if (!onboarding) {
      throw new HttpException(404, "Onboarding record not found");
    }
    
    if (onboarding.completed) {
      throw new HttpException(400, "Onboarding already completed");
    }
    
    const updated = await onboardingRepository.update(userId, {
      completed: true,
      completedAt: new Date(),
      preferences: preferences || onboarding.preferences,
    });
    
    if (!updated) {
      throw new HttpException(500, "Failed to complete onboarding");
    }
    
    return updated;
  }
}
