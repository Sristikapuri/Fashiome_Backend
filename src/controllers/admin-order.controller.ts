import { Request, Response } from "express";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { OrderService } from "../services/order.service";
import { ClothesService } from "../services/clothes.service";
import { UserService } from "../services/user.service";

const orderService = new OrderService();
const clothesService = new ClothesService();
const userService = new UserService();

const VALID_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

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
          const plain = (order as any).toObject();

          let customerDisplayName = plain.customerName || "Unknown";
          try {
            const user = await userService.getUserById(plain.userId.toString());
            if (user) {
              const u = user as any;
              customerDisplayName = plain.customerName || u.name || u.username || u.email || "Unknown";
            }
          } catch { /* silent */ }

          const items = await Promise.all(
            plain.items.map(async (item: any) => {
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
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to retrieve orders", error.status || 500);
    }
  }


  async getOrderStats(req: Request, res: Response) {
    try {
      const stats = await orderService.getStats();
      return ApiResponseHelper.success(res, stats, "Order stats retrieved");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to retrieve stats", error.status || 500);
    }
  }


  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || typeof id !== "string") throw new HttpException(400, "Invalid order id");
      if (!status || !VALID_STATUSES.includes(status as any)) {
        throw new HttpException(400, "Status must be one of: " + VALID_STATUSES.join(", "));
      }

      const order = await orderService.getById(id);
      if (!order) throw new HttpException(404, "Order not found");

      const updated = await orderService.updateById(id, { status } as any);
      return ApiResponseHelper.success(res, (updated as any).toObject(), "Order status updated");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to update order status", error.status || 500);
    }
  }

  async deleteOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== "string") throw new HttpException(400, "Invalid order id");

      const deleted = await orderService.delete(id);
      if (!deleted) throw new HttpException(404, "Order not found");

      return ApiResponseHelper.success(res, null, "Order deleted successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to delete order", error.status || 500);
    }
  }
}
