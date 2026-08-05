import { Request, Response } from "express";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { StripeService } from "../services/stripe.service";
import { OrderService } from "../services/order.service";
import type { AuthenticatedRequest } from "../middlewares/authorized.middleware";

const stripeService = new StripeService();
const orderService = new OrderService();

const getUserId = (req: Request): string => {
  const userId = (req as AuthenticatedRequest).user?._id?.toString();
  if (!userId) throw new HttpException(401, "Unauthorized user missing");
  return userId;
};

export class StripeController {
  async createPaymentIntent(req: Request, res: Response) {
    try {
      const { amount, orderId } = { ...req.query, ...req.body };
      const normalizedOrderId = typeof orderId === "string" ? orderId.trim() : "";

      if (!normalizedOrderId) {
        throw new HttpException(400, "Order ID is required");
      }

      const userId = getUserId(req);
      const order = await orderService.getById(normalizedOrderId);
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");
      if (order.status !== "pending") {
        throw new HttpException(400, "This order is no longer awaiting payment");
      }

      const parsedAmount = Number(amount);
      const orderTotal = (Number.isFinite(parsedAmount) && parsedAmount > 0)
        ? parsedAmount
        : Number(order.total);

      if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
        throw new HttpException(400, "Order has an invalid total amount");
      }

      const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent({
        amount: orderTotal,
        orderId: normalizedOrderId,
      });

      await orderService.updateById(normalizedOrderId, { stripePaymentIntentId: paymentIntentId });

      return ApiResponseHelper.success(
        res,
        { clientSecret, paymentIntentId },
        "Payment intent created successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to create payment intent"),
        getErrorStatus(error)
      );
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const payload = { ...req.query, ...req.body };
      const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
      if (!orderId) throw new HttpException(400, "Order ID is required");

      const userId = getUserId(req);
      const order = await orderService.getById(orderId);
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");

      if (!order.stripePaymentIntentId) {
        throw new HttpException(400, "No Stripe payment was initiated for this order");
      }

      const result = await stripeService.retrievePaymentIntent(order.stripePaymentIntentId);
      const isVerified = result.status === "succeeded";

      if (isVerified) {
        // Allow up to $0.50 tolerance to handle currency rounding across
        // Stripe's internal integer math and our stored float.
        if (Math.abs(result.amountReceived - Number(order.total)) > 0.50) {
          throw new HttpException(400, "Payment amount does not match the order");
        }

        await orderService.updateById(orderId, { status: "paid" });
      }

      return ApiResponseHelper.success(
        res,
        { verified: isVerified, status: result.status, orderId },
        isVerified ? "Payment verified and order marked as paid successfully" : "Payment is not complete yet"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to verify payment"),
        getErrorStatus(error)
      );
    }
  }
}
