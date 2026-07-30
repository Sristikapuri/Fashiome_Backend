import { Request, Response } from "express";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { ClothesService } from "../services/clothes.service";
import { ClothesCreateDTO, ClothesUpdateDTO } from "../dtos/clothes.dto";
import { IClothe } from "../models/clothes.model";
import { resolveUploadedFileUrl } from "../services/media-storage.service";

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

export class AdminClothesController {
  private sanitizeItem(item: IClothe) {
    return item.toObject();
  }

  async getAll(req: Request, res: Response) {
    try {
      const page = req.query.page ? getNumberParam(req.query.page as string | string[], "page") : 1;
      const limit = req.query.limit ? getNumberParam(req.query.limit as string | string[], "limit") : 10;
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;

      const { items, total } = await clothesService.getPaginated(page, limit, search, category, status);
      const totalPages = Math.ceil(total / limit);

      return ApiResponseHelper.success(
        res,
        {
          data: items.map((item) => this.sanitizeItem(item)),
          meta: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        "Clothes retrieved successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve clothes"),
        getErrorStatus(error)
      );
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const item = await clothesService.getById(id);
      if (!item) {
        return ApiResponseHelper.error(res, "Clothes item not found", 404);
      }
      return ApiResponseHelper.success(res, this.sanitizeItem(item), "Clothes item retrieved successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve clothes item"),
        getErrorStatus(error)
      );
    }
  }

  async create(req: Request, res: Response) {
    try {
      const file = req.file as Express.Multer.File | undefined;
      const body = {
        ...req.body,
        price: req.body?.price ? Number(req.body.price) : req.body.price,
        stock: req.body?.stock ? Number(req.body.stock) : req.body.stock,
        ...(req.body?.discountedPrice !== undefined && req.body?.discountedPrice !== "" && req.body?.discountedPrice !== "null"
          ? { discountedPrice: Number(req.body.discountedPrice) }
          : { discountedPrice: null }),
        ...(file ? { imageUrl: resolveUploadedFileUrl(file) } : {}),
      };
      const validationResult = ClothesCreateDTO.safeParse(body);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        return ApiResponseHelper.error(res, "Validation failed", 400, { errors: errorDetails });
      }

      const created = await clothesService.create(validationResult.data);
      return ApiResponseHelper.success(res, this.sanitizeItem(created), "Clothes item created successfully", 201);
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to create clothes item"),
        getErrorStatus(error)
      );
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const file = req.file as Express.Multer.File | undefined;
      const body = {
        ...req.body,
        ...(req.body?.price !== undefined ? { price: Number(req.body.price) } : {}),
        ...(req.body?.stock !== undefined ? { stock: Number(req.body.stock) } : {}),
        ...(req.body?.discountedPrice !== undefined && req.body?.discountedPrice !== "" && req.body?.discountedPrice !== "null"
          ? { discountedPrice: Number(req.body.discountedPrice) }
          : req.body?.discountedPrice === "" || req.body?.discountedPrice === "null"
          ? { discountedPrice: null }
          : {}),
        ...(file ? { imageUrl: resolveUploadedFileUrl(file) } : {}),
      };
      const validationResult = ClothesUpdateDTO.safeParse(body);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        return ApiResponseHelper.error(res, "Validation failed", 400, { errors: errorDetails });
      }

      const updated = await clothesService.update(id, validationResult.data);
      if (!updated) {
        return ApiResponseHelper.error(res, "Clothes item not found", 404);
      }

      return ApiResponseHelper.success(res, this.sanitizeItem(updated), "Clothes item updated successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to update clothes item"),
        getErrorStatus(error)
      );
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const deleted = await clothesService.delete(id);
      if (!deleted) {
        return ApiResponseHelper.error(res, "Clothes item not found", 404);
      }
      return ApiResponseHelper.success(res, null, "Clothes item deleted successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to delete clothes item"),
        getErrorStatus(error)
      );
    }
  }

  
  async getLowStock(req: Request, res: Response) {
    try {
      const threshold = req.query.threshold
        ? Math.max(0, parseInt(String(req.query.threshold), 10) || 5)
        : 5;
      const items = await clothesService.getLowStock(threshold);
      return ApiResponseHelper.success(
        res,
        items.map((i) => i.toObject()),
        "Low-stock items retrieved"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to retrieve low-stock items"), getErrorStatus(error));
    }
  }
}
