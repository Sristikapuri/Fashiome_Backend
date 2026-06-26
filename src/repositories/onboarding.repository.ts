import { OnboardingModel, IOnboarding } from "../models/onboarding.model";

export interface IOnboardingRepository {
  getByUserId(userId: string): Promise<IOnboarding | null>;
  create(onboarding: Partial<IOnboarding>): Promise<IOnboarding>;
  update(userId: string, data: Partial<IOnboarding>): Promise<IOnboarding | null>;
}

export class OnboardingMongoRepository implements IOnboardingRepository {
  async getByUserId(userId: string): Promise<IOnboarding | null> {
    const found = await OnboardingModel.findOne({ userId });
    return found;
  }

  async create(onboarding: Partial<IOnboarding>): Promise<IOnboarding> {
    const created = await OnboardingModel.create(onboarding);
    return created;
  }

  async update(userId: string, data: Partial<IOnboarding>): Promise<IOnboarding | null> {
    const updated = await OnboardingModel.findOneAndUpdate({ userId }, data, { returnDocument: 'after' });
    return updated;
  }
}
