import { Request, Response } from "express";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import type { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { IOrderItem } from "../models/order.model";
import { CartService } from "../services/cart.service";
import { ClothesService } from "../services/clothes.service";
import { OrderService } from "../services/order.service";
import { EmailService } from "../services/email.service";

const cartService = new CartService();
const clothesService = new ClothesService();
const orderService = new OrderService();
const emailService = new EmailService();

const getUserId = (req: Request) => {
  const user = (req as AuthenticatedRequest).user;
  const userId = user?._id?.toString();
  if (!userId) throw new HttpException(401, "Unauthorized user missing");
  return userId;
};

export class OrderController {
  async cancelOrder(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const order = await orderService.getById(String(req.params.id));
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");
      if (!["pending", "paid"].includes(order.status)) {
        throw new HttpException(400, "This order can no longer be cancelled");
      }
      const updated = await orderService.updateById(order._id.toString(), { status: "cancelled" });
      return ApiResponseHelper.success(res, { order: updated?.toObject() }, "Order cancelled successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to cancel order"), getErrorStatus(error));
    }
  }

  async createOrder(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const {
        shippingAddress,
        customerName,
        customerEmail,
        phone,
        city,
        postalCode,
        paymentMethod,
      } = req.body || {};

      if (!shippingAddress || typeof shippingAddress !== "string" || !shippingAddress.trim()) {
        throw new HttpException(400, "Shipping address is required");
      }

      const cart = await cartService.getCart(userId);
      const cartItems = cart?.items ?? [];
      if (cartItems.length === 0) {
        throw new HttpException(400, "Cart is empty");
      }

      const orderItems = await Promise.all(
        cartItems.map(async (entry) => {
          const clothe = await clothesService.getById(entry.clotheId.toString());
          if (!clothe) {
            throw new HttpException(400, "One or more cart items are unavailable");
          }
          return {
            clotheId: entry.clotheId.toString(),
            quantity: entry.quantity,
            price: clothe.discountedPrice ?? clothe.price,
          };
        })
      );

      const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = subtotal * 0.05;
      const total = subtotal + tax;

      const method = paymentMethod || "cod";

      const initialStatus = "pending";
      const esewaTransactionId =
        method === "esewa" ? `FM-${Date.now()}-${userId.slice(-4)}` : undefined;

      const order = await orderService.create({
        userId,
        items: orderItems,
        shippingAddress,
        customerName: customerName?.trim() || undefined,
        customerEmail: customerEmail?.trim() || undefined,
        phone: phone?.trim() || undefined,
        city: city?.trim() || undefined,
        postalCode: postalCode?.trim() || undefined,
        paymentMethod: method,
        esewaTransactionId,
        subtotal,
        tax,
        total,
        status: initialStatus,
      });

      // Send order confirmation email in the background so the response
      // isn't blocked on the SMTP round-trip.
      if (customerEmail && customerName && method !== "esewa") {
        void Promise.all(
          orderItems.map(async (item) => {
            const clothe = await clothesService.getById(item.clotheId);
            return {
              name: clothe?.name || "Product",
              quantity: item.quantity,
              price: item.price,
            };
          })
        )
          .then((itemsWithEmailDetails) =>
            emailService.sendOrderConfirmation({
              to: customerEmail,
              customerName,
              orderId: order._id.toString(),
              total,
              items: itemsWithEmailDetails,
              shippingAddress,
            })
          )
          .catch((error) => {
            console.error("Failed to send order confirmation email:", error);
          });
      }

      return ApiResponseHelper.success(
        res,
        { order: order.toObject() },
        method === "esewa"
          ? "Order created successfully. Complete eSewa payment to confirm it."
          : "Order placed successfully",
        201
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to place order"), getErrorStatus(error));
    }
  }

  async getMyOrders(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const orders = await orderService.getOrdersByUserId(userId);
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const plainOrder = order.toObject();
          const items = await Promise.all(
            plainOrder.items.map(async (item: IOrderItem) => {
              const clothe = await clothesService.getById(item.clotheId.toString());
              return {
                ...item,
                name: clothe?.name ?? "Item",
                imageUrl: clothe?.imageUrl ?? "",
                category: clothe?.category ?? "",
                size: clothe?.size ?? "",
                color: clothe?.color ?? "",
              };
            })
          );
          return { ...plainOrder, items };
        })
      );
      return ApiResponseHelper.success(
        res,
        { orders: ordersWithItems },
        "Orders retrieved successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to retrieve orders"), getErrorStatus(error));
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const order = await orderService.getById(String(id));
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");

      const plainOrder = order.toObject();
      const items = await Promise.all(
        plainOrder.items.map(async (item: IOrderItem) => {
          const clothe = await clothesService.getById(item.clotheId.toString());
          return {
            ...item,
            name: clothe?.name ?? "Item",
            imageUrl: clothe?.imageUrl ?? "",
            category: clothe?.category ?? "",
            size: clothe?.size ?? "",
            color: clothe?.color ?? "",
          };
        })
      );

      return ApiResponseHelper.success(res, { ...plainOrder, items }, "Order retrieved successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(res, getErrorMessage(error, "Failed to retrieve order"), getErrorStatus(error));
    }
  }
}
