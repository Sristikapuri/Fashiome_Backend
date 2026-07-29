import { SilhouetteService } from "../services/silhouette.service";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";
import { SilhouetteType } from "../types/silhouette.type";

const silhouetteService = new SilhouetteService();

export class SilhouetteController {
  async getSilhouetteProfile(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const silhouette = await silhouetteService.getSilhouetteProfile(userId);
      return ApiResponseHelper.success(res, silhouette, "Silhouette profile retrieved successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve silhouette profile"),
        getErrorStatus(error)
      );
    }
  }

  async saveSilhouetteProfile(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const profileData = req.body as Partial<SilhouetteType>;
      const silhouette = await silhouetteService.saveSilhouetteProfile(userId, profileData);
      return ApiResponseHelper.success(res, silhouette, "Silhouette profile saved successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to save silhouette profile"),
        getErrorStatus(error)
      );
    }
  }

  async clearSilhouetteProfile(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      await silhouetteService.clearSilhouetteProfile(userId);
      return ApiResponseHelper.success(res, null, "Silhouette profile cleared successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to clear silhouette profile"),
        getErrorStatus(error)
      );
    }
  }
}
