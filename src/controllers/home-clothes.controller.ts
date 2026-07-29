import { Request, Response } from "express";
import { ClothesService } from "../services/clothes.service";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";

const clothesService = new ClothesService();

const getStringParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new HttpException(400, `Invalid ${name} parameter`);
};

const getNumberParam = (value: string | string[] | undefined, name: string) => {
  const num = typeof value === "string" ? parseInt(value, 10) : NaN;
  if (!isNaN(num) && num > 0) {
    return num;
  }

  throw new HttpException(400, `Invalid ${name} parameter`);
};

export class HomeClothesController {
  async getById(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const item = await clothesService.getById(id);
      if (!item || item.status !== "active") {
        return ApiResponseHelper.error(res, "Clothes item not found", 404);
      }

      return ApiResponseHelper.success(
        res,
        item.toObject(),
        "Clothes item retrieved successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve clothes item"),
        getErrorStatus(error)
      );
    }
  }

  async getCatalog(req: Request, res: Response) {
    try {
      const page = req.query.page ? getNumberParam(req.query.page as string | string[], "page") : 1;
      const limit = req.query.limit ? getNumberParam(req.query.limit as string | string[], "limit") : 12;
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;

      const { items, total } = await clothesService.getPaginated(page, limit, search, category, "active");
      const totalPages = Math.ceil(total / limit);

      return ApiResponseHelper.success(
        res,
        {
          data: items.map((item) => item.toObject()),
          meta: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        "Clothes catalog retrieved successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve clothes catalog"),
        getErrorStatus(error)
      );
    }
  }
}
