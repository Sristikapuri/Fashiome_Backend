import { Request, Response } from "express";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { OrderService } from "../services/order.service";
import { ClothesService } from "../services/clothes.service";
import { UserService } from "../services/user.service";
import { IOrder, IOrderItem } from "../models/order.model";

const orderService = new OrderService();
const clothesService = new ClothesService();
const userService = new UserService();

const VALID_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

const isValidOrderStatus = (value: unknown): value is IOrder["status"] =>
  typeof value === "string" && (VALID_STATUSES as readonly string[]).includes(value);

export class AdminOrderController {

  async getAllOrders(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "15"), 10) || 15));
      const status = req.query.status as string | undefined;
      const paymentMethod = req.query.paymentMethod as string | undefined;

      const { orders, total } = await orderService.getAllOrders(page, limit, status, paymentMethod);

      const enriched = await Promise.all(
        orders.map(async (order) => {
          const plain = order.toObject();

          let customerDisplayName = plain.customerName || "Unknown";
          try {
            const user = await userService.getUserById(plain.userId.toString());
            if (user) {
              customerDisplayName = plain.customerName || user.username || user.email || "Unknown";
            }
          } catch { /* silent */ }

          const items = await Promise.all(
            plain.items.map(async (item: IOrderItem) => {
              const clothe = await clothesService.getById(item.clotheId.toString()).catch(() => null);
              return {
                ...item,
                name: clothe?.name ?? "Item",
                imageUrl: clothe?.imageUrl ?? "",
              };
            })
          );

          return { ...plain, items, customerDisplayName };
        })
      );

      return ApiResponseHelper.success(
        res,
        {
          data: enriched,
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
        "Orders retrieved successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to retrieve orders"), getErrorStatus(error));
    }
  }


  async getOrderStats(req: Request, res: Response) {
    try {
      const stats = await orderService.getStats();
      return ApiResponseHelper.success(res, stats, "Order stats retrieved");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to retrieve stats"), getErrorStatus(error));
    }
  }


  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || typeof id !== "string") throw new HttpException(400, "Invalid order id");
      if (!isValidOrderStatus(status)) {
        throw new HttpException(400, "Status must be one of: " + VALID_STATUSES.join(", "));
      }

      const order = await orderService.getById(id);
      if (!order) throw new HttpException(404, "Order not found");

      const updated = await orderService.updateById(id, { status });
      return ApiResponseHelper.success(res, updated.toObject(), "Order status updated");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to update order status"), getErrorStatus(error));
    }
  }

  async deleteOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== "string") throw new HttpException(400, "Invalid order id");

      const deleted = await orderService.delete(id);
      if (!deleted) throw new HttpException(404, "Order not found");

      return ApiResponseHelper.success(res, null, "Order deleted successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to delete order"), getErrorStatus(error));
    }
  }
}
