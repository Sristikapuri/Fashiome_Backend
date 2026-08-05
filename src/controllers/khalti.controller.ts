import { Request, Response } from "express";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { KhaltiService } from "../services/khalti.service";
import { OrderService } from "../services/order.service";
import type { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { getFrontendUrl } from "../configs/constant";

const khaltiService = new KhaltiService();
const orderService = new OrderService();

const getUserId = (req: Request): string => {
  const userId = (req as AuthenticatedRequest).user?._id?.toString();
  if (!userId) throw new HttpException(401, "Unauthorized user missing");
  return userId;
};

export class KhaltiController {
  async getPaymentUrl(req: Request, res: Response) {
    try {
      const { amount, orderId, platform } = { ...req.query, ...req.body };
      const normalizedAmount = Number(amount);
      const normalizedOrderId = typeof orderId === "string" ? orderId : "";
      const normalizedPlatform = platform === "mobile" ? "mobile" : "web";

      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || !normalizedOrderId) {
        throw new HttpException(400, "Amount and order ID are required");
      }

      const userId = getUserId(req);
      const order = await orderService.getById(normalizedOrderId);
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");
      if (Math.abs(Number(order.total) - normalizedAmount) > 0.01) {
        throw new HttpException(400, "Payment amount does not match the order");
      }
      if (order.status !== "pending") {
        throw new HttpException(400, "This order is no longer awaiting payment");
      }

      // Khalti hands control back to the app/site itself after checkout (no
      // signed redirect page needed like eSewa) — on mobile that means our
      // custom URL scheme so the Flutter app regains control after the
      // in-browser checkout closes.
      const returnUrl =
        normalizedPlatform === "mobile"
          ? `fashiome://khalti-payment?orderId=${encodeURIComponent(normalizedOrderId)}`
          : `${getFrontendUrl()}/dashboard/orders?orderId=${encodeURIComponent(normalizedOrderId)}`;

      const { pidx, paymentUrl } = await khaltiService.initiate({
        amount: normalizedAmount,
        orderId: normalizedOrderId,
        returnUrl,
        websiteUrl: getFrontendUrl(),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.phone,
      });

      await orderService.updateById(normalizedOrderId, { khaltiPidx: pidx });

      return ApiResponseHelper.success(res, { paymentUrl, pidx }, "Payment URL generated successfully");
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to generate payment URL"),
        getErrorStatus(error)
      );
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const payload = { ...req.query, ...req.body };
      const orderIdValue = payload.orderId;
      const orderId = typeof orderIdValue === "string" ? orderIdValue : "";
      if (!orderId) throw new HttpException(400, "Order ID is required");

      const userId = getUserId(req);
      const order = await orderService.getById(orderId);
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");

      if (!order.khaltiPidx) {
        throw new HttpException(400, "No Khalti payment was initiated for this order");
      }

      const result = await khaltiService.lookup(order.khaltiPidx);
      const isVerified = result.status === "Completed";

      if (isVerified) {
        if (
          typeof result.totalAmount === "number" &&
          Math.abs(result.totalAmount / 100 - Number(order.total)) > 0.01
        ) {
          throw new HttpException(400, "Payment amount does not match the order");
        }

        await orderService.updateById(orderId, {
          status: "paid",
          khaltiTransactionId: result.transactionId,
        });
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
