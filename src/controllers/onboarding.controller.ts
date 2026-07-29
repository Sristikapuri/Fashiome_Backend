import { OnboardingService } from "../services/onboarding.service";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";
import { OnboardingType } from "../types/onboarding.type";

const onboardingService = new OnboardingService();

export class OnboardingController {
  async getOnboardingStatus(req: Request, res: Response) {
    try {

      const userId = req.user?._id?.toString();
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const onboarding = await onboardingService.getOnboardingStatus(userId);
      return ApiResponseHelper.success(res, onboarding, "Onboarding status retrieved successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve onboarding status"),
        getErrorStatus(error)
      );
    }
  }

  async completeOnboarding(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const { preferences } = req.body as { preferences?: OnboardingType["preferences"] };
      const onboarding = await onboardingService.completeOnboarding(userId, preferences);
      return ApiResponseHelper.success(res, onboarding, "Onboarding completed successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to complete onboarding"),
        getErrorStatus(error)
      );
    }
  }
}
