import { SilhouetteService } from "../services/silhouette.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";

const silhouetteService = new SilhouetteService();

export class SilhouetteController {
  async getSilhouetteProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const silhouette = await silhouetteService.getSilhouetteProfile(userId);
      return ApiResponseHelper.success(res, silhouette, "Silhouette profile retrieved successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to retrieve silhouette profile",
        error.status || 500
      );
    }
  }

  async saveSilhouetteProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      const profileData = req.body;
      const silhouette = await silhouetteService.saveSilhouetteProfile(userId, profileData);
      return ApiResponseHelper.success(res, silhouette, "Silhouette profile saved successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to save silhouette profile",
        error.status || 500
      );
    }
  }

  async clearSilhouetteProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?._id?.toString() || (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        throw new HttpException(401, "User not authenticated");
      }

      await silhouetteService.clearSilhouetteProfile(userId);
      return ApiResponseHelper.success(res, null, "Silhouette profile cleared successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to clear silhouette profile",
        error.status || 500
      );
    }
  }
}
