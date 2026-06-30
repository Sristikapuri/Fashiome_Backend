import { Request, Response } from "express";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { CartService } from "../services/cart.service";
import { ClothesService } from "../services/clothes.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const cartService = new CartService();
const clothesService = new ClothesService();

const getUserId = (req: Request) => {
  const user = (req as AuthRequest).user;
  const userId = user?._id?.toString();
  if (!userId) {
    throw new HttpException(401, "Unauthorized user missing");
  }
  return userId;
};

const normalizeItems = (items: any) => {
  if (!Array.isArray(items)) {
    throw new HttpException(400, "Invalid cart items");
  }

  return items.map((item) => {
    const clotheId = item?.clotheId?.toString?.() ?? item?.clotheId;
    const quantity = Number(item?.quantity);
    if (typeof clotheId !== "string" || !clotheId.trim() || !Number.isInteger(quantity) || quantity < 1) {
      throw new HttpException(400, "Invalid cart item payload");
    }

    return { clotheId, quantity };
  });
};

export class CartController {
  async getCart(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const cart = await cartService.getCart(userId);
      const items = await Promise.all(
        (cart?.items ?? []).map(async (entry) => {
          const clothe = await clothesService.getById(entry.clotheId.toString());
          if (!clothe) return null;
          return {
            clothe: clothe.toObject(),
            quantity: entry.quantity,
          };
        })
      );

      return ApiResponseHelper.success(
        res,
        {
          items: items.filter(Boolean),
        },
        "Cart retrieved successfully"
      );
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to retrieve cart", error.status || 500);
    }
  }

  async setCart(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const items = normalizeItems(req.body?.items);
      const cart = await cartService.setCart(userId, items);
      return ApiResponseHelper.success(
        res,
        cart.toObject(),
        "Cart updated successfully"
      );
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to update cart", error.status || 500);
    }
  }
}
