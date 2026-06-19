import { OnboardingService } from "../services/onboarding.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";

const onboardingService = new OnboardingService();

export class OnboardingController {
  async getOnboardingStatus(req: Request, res: Response) {
    try {
      // Get userId from authenticated user (from auth middleware)
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const onboarding = await onboardingService.getOnboardingStatus(userId);
      return ApiResponseHelper.success(res, onboarding, "Onboarding status retrieved successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to retrieve onboarding status",
        error.status || 500
      );
    }
  }

  async completeOnboarding(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const { preferences } = req.body;
      const onboarding = await onboardingService.completeOnboarding(userId, preferences);
      return ApiResponseHelper.success(res, onboarding, "Onboarding completed successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to complete onboarding",
        error.status || 500
      );
    }
  }
}
