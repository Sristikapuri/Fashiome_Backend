import { Request, Response } from "express";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { EsewaService } from "../services/esewa.service";
import { OrderService } from "../services/order.service";
import type { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { getFrontendUrl } from "../configs/constant";

const esewaService = new EsewaService();
const orderService = new OrderService();
const PRODUCT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";

const getUserId = (req: Request): string => {
  const userId = (req as AuthenticatedRequest).user?._id?.toString();
  if (!userId) throw new HttpException(401, "Unauthorized user missing");
  return userId;
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] || character
  );

export class EsewaController {
  async getPaymentUrl(req: Request, res: Response) {
    try {
      const { amount, orderId } = { ...req.query, ...req.body };
      const normalizedAmount = Number(amount);
      const normalizedOrderId = typeof orderId === "string" ? orderId : "";

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

      const transactionUuid = esewaService.generateTransactionUuid(normalizedOrderId);
      await orderService.updateById(normalizedOrderId, { esewaTransactionId: transactionUuid });

      const token = esewaService.generateCheckoutToken({
        amount: normalizedAmount,
        orderId: normalizedOrderId,
        productCode: PRODUCT_CODE,
        transactionUuid,
      });
      const publicApiOrigin = (
        process.env.PUBLIC_API_URL ||
        `${req.protocol}://${req.get("host") || "localhost:8089"}`
      ).replace(/\/$/, "");
      const checkoutUrl = new URL(`${publicApiOrigin}/api/v1/esewa/checkout`);
      checkoutUrl.searchParams.set("amount", normalizedAmount.toFixed(2));
      checkoutUrl.searchParams.set("orderId", normalizedOrderId);
      checkoutUrl.searchParams.set("productCode", PRODUCT_CODE);
      checkoutUrl.searchParams.set("transactionUuid", transactionUuid);
      checkoutUrl.searchParams.set("token", token);

      return ApiResponseHelper.success(
        res,
        { paymentUrl: checkoutUrl.toString() },
        "Payment URL generated successfully"
      );
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to generate payment URL"),
        getErrorStatus(error)
      );
    }
  }

  async checkout(req: Request, res: Response) {
    try {
      const amount = Number(req.query.amount);
      const orderId = typeof req.query.orderId === "string" ? req.query.orderId : "";
      const productCode =
        typeof req.query.productCode === "string" ? req.query.productCode : "";
      const transactionUuid =
        typeof req.query.transactionUuid === "string" ? req.query.transactionUuid : "";
      const token = typeof req.query.token === "string" ? req.query.token : "";

      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !orderId ||
        !transactionUuid ||
        productCode !== PRODUCT_CODE ||
        !token ||
        !esewaService.isValidCheckoutToken({ amount, orderId, productCode, transactionUuid, token })
      ) {
        throw new HttpException(400, "Invalid or expired payment checkout link");
      }

      const successUrl = `${getFrontendUrl()}/dashboard/orders?payment=success&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount.toFixed(2))}`;
      const failureUrl = `${getFrontendUrl()}/dashboard/orders?payment=failed&orderId=${encodeURIComponent(orderId)}`;
      const fields = esewaService.generatePaymentFields({
        amount,
        transactionUuid,
        productCode,
        successUrl,
        failureUrl,
      });
      const inputs = Object.entries(fields)
        .map(
          ([name, value]) =>
            `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`
        )
        .join("");

      res.type("html").send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Secure eSewa Checkout</title></head>
  <body style="font-family: sans-serif; text-align: center; padding: 40px; background-color: #FFF7F7;">
    <h2 style="color: #820000;">Redirecting to Secure eSewa Gateway…</h2>
    <p style="color: #735656;">Please wait while we transfer you to eSewa.</p>
    <form id="esewa-form" method="post" action="${escapeHtml(esewaService.getPaymentEndpoint())}">
      ${inputs}
      <button type="submit" style="background-color: #60BB46; color: white; border: none; padding: 12px 24px; border-radius: 24px; font-weight: bold; cursor: pointer; margin-top: 10px;">Proceed to eSewa Portal</button>
    </form>
    <script>setTimeout(function() { document.getElementById("esewa-form").submit(); }, 1200);</script>
  </body>
</html>`);
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to start payment checkout"),
        getErrorStatus(error)
      );
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const payload = { ...req.query, ...req.body };
      const orderIdValue = payload.orderId ?? payload.oid ?? payload.pid;
      const orderId = typeof orderIdValue === "string" ? orderIdValue : "";
      if (!orderId) throw new HttpException(400, "Order ID is required");

      const userId = getUserId(req);
      const order = await orderService.getById(orderId);
      if (!order) throw new HttpException(404, "Order not found");
      if (order.userId.toString() !== userId) throw new HttpException(403, "Forbidden");

      const encodedData = typeof payload.data === "string" ? payload.data : "";
      if (!encodedData) {
        const amount = Number(payload.amount ?? order.total);
        if (!Number.isFinite(amount) || Math.abs(Number(order.total) - amount) > 0.01) {
          throw new HttpException(400, "Payment amount does not match the order");
        }

        const status = await esewaService.getPaymentStatus({
          totalAmount: Number(order.total),
          transactionUuid: order.esewaTransactionId || orderId,
          productCode: PRODUCT_CODE,
        });

        const testBypassEnabled = process.env.ESEWA_TEST_BYPASS === "true";
        const isVerified =
          status.status === "COMPLETE" || (testBypassEnabled && payload.payment === "success");
        const refId = status.refId || (typeof payload.refId === "string" && payload.refId ? payload.refId : `ESEWA_TEST_${Date.now().toString().slice(-8)}`);

        if (isVerified) {
          await orderService.updateById(orderId, {
            status: "paid",
            esewaTransactionId: refId,
            esewaRefId: refId,
          });
        }

        return ApiResponseHelper.success(
          res,
          { verified: isVerified, status: isVerified ? "COMPLETE" : status.status, refId, orderId },
          isVerified
            ? "Payment verified and order marked as paid successfully"
            : "Payment is not complete yet"
        );
      }

      let esewaData: Record<string, unknown>;
      try {
        esewaData = JSON.parse(Buffer.from(encodedData, "base64").toString("utf-8"));
      } catch {
        throw new HttpException(400, "Invalid eSewa response encoding");
      }

      const signedFieldNames = String(esewaData.signed_field_names || "")
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);
      const expectedSignature = esewaService.generateSignature(esewaData, signedFieldNames);
      if (!esewaData.signature || expectedSignature !== esewaData.signature) {
        throw new HttpException(400, "Signature mismatch — payment verification failed");
      }
      if (esewaData.status !== "COMPLETE") {
        throw new HttpException(400, "Payment not completed");
      }
      const transactionUuidFromEsewa = String(esewaData.transaction_uuid || "");
      if (transactionUuidFromEsewa !== orderId && !transactionUuidFromEsewa.startsWith(`${orderId}-`)) {
        throw new HttpException(400, "Payment transaction does not match the order");
      }
      if (
        String(esewaData.product_code) !== PRODUCT_CODE ||
        Math.abs(Number(esewaData.total_amount) - Number(order.total)) > 0.01
      ) {
        throw new HttpException(400, "Payment details do not match the order");
      }

      const status = await esewaService.getPaymentStatus({
        totalAmount: Number(order.total),
        transactionUuid: transactionUuidFromEsewa,
        productCode: PRODUCT_CODE,
      });
      if (status.status !== "COMPLETE") {
        throw new HttpException(400, "eSewa status verification check failed");
      }

      const transactionId = String(esewaData.transaction_code || status.refId || "");
      await orderService.updateById(orderId, {
        status: "paid",
        esewaTransactionId: transactionId || undefined,
        esewaRefId: status.refId || transactionId || undefined,
      });

      return ApiResponseHelper.success(
        res,
        { verified: true, refId: status.refId || transactionId, orderId },
        "Payment verified and order marked as paid successfully"
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
