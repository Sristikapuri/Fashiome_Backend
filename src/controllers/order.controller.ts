import { Request, Response } from "express";
import crypto from "crypto";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { AuthRequest } from "../middlewares/auth.middleware";
import { CartService } from "../services/cart.service";
import { ClothesService } from "../services/clothes.service";
import { OrderService } from "../services/order.service";

const cartService = new CartService();
const clothesService = new ClothesService();
const orderService = new OrderService();


const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";
const ESEWA_SECRET = process.env.ESEWA_SECRET || "8gBm/:&EnhH.1/q";
const ESEWA_PAYMENT_URL =
  process.env.ESEWA_PAYMENT_URL ||
  "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const getUserId = (req: Request) => {
  const user = (req as AuthRequest).user;
  const userId = user?._id?.toString();
  if (!userId) throw new HttpException(401, "Unauthorized user missing");
  return userId;
};

function buildEsewaSignature(
  totalAmount: number,
  transactionUuid: string,
  productCode: string
) {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto
    .createHmac("sha256", ESEWA_SECRET)
    .update(message)
    .digest("base64");
}

export class OrderController {
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

      // eSewa orders are marked as paid immediately (no redirect flow)
      const initialStatus = method === "esewa" ? "paid" : "pending";
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
      } as any);

      return ApiResponseHelper.success(
        res,
        { order: order.toObject() },
        method === "esewa" ? "Order placed and payment confirmed" : "Order placed successfully",
        201
      );
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to place order", error.status || 500);
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
            plainOrder.items.map(async (item: any) => {
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
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to retrieve orders", error.status || 500);
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const order = await orderService.getById(String(id));
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");

      const plainOrder = (order as any).toObject();
      const items = await Promise.all(
        plainOrder.items.map(async (item: any) => {
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
    } catch (error: Error | any) {
      return ApiResponseHelper.error(res, error.message || "Failed to retrieve order", error.status || 500);
    }
  }

  async verifyEsewaPayment(req: Request, res: Response) {
    try {
   
      const encodedData = req.query.data as string;
      const orderId = req.query.orderId as string;

      if (!encodedData || !orderId) {
        throw new HttpException(400, "Missing payment verification data");
      }

      let esewaData: any;
      try {
        esewaData = JSON.parse(Buffer.from(encodedData, "base64").toString("utf-8"));
      } catch {
        throw new HttpException(400, "Invalid eSewa response encoding");
      }


      const { total_amount, transaction_uuid, product_code, signature: esewaSignature, status, ref_id } = esewaData;
      if (status !== "COMPLETE") {
        throw new HttpException(400, "Payment not completed");
      }

      const expectedSignature = buildEsewaSignature(total_amount, transaction_uuid, product_code);
      if (expectedSignature !== esewaSignature) {
        throw new HttpException(400, "Signature mismatch — payment verification failed");
      }


      const order = await orderService.getById(orderId as string);
      if (!order) throw new HttpException(404, "Order not found");

      await orderService.updateById(orderId as string, {
        status: "paid",
        esewaRefId: ref_id,
      } as any);


      res.redirect(`${FRONTEND_URL}/dashboard?tab=profile&payment=success&orderId=${orderId}`);
    } catch (error: Error | any) {
      res.redirect(`${FRONTEND_URL}/dashboard?tab=profile&payment=failed`);
    }
  }
}
