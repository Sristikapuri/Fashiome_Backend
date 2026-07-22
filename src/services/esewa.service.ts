import crypto from "crypto";

export class EsewaService {
  private testMode: boolean;
  private secret: string;

  constructor() {
    this.testMode = process.env.NODE_ENV !== "production";
    this.secret =
      process.env.ESEWA_SECRET ||
      process.env.ESEWA_SECRET_KEY ||
      "8gBm/:&EnhH.1/q";
  }

  getPaymentEndpoint(): string {
    return this.testMode
      ? "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
      : "https://epay.esewa.com.np/api/epay/main/v2/form";
  }

  generateSignature(
    data: Record<string, unknown>,
    signedFieldNames: string[] = [
      "total_amount",
      "transaction_uuid",
      "product_code",
    ]
  ): string {
    const message = signedFieldNames
      .map((field) => `${field}=${String(data[field] ?? "")}`)
      .join(",");

    return crypto
      .createHmac("sha256", this.secret)
      .update(message)
      .digest("base64");
  }

  generatePaymentFields(params: {
    amount: number;
    orderId: string;
    productCode: string;
    successUrl: string;
    failureUrl: string;
  }): Record<string, string> {
    const { amount, orderId, productCode, successUrl, failureUrl } = params;
    const fields: Record<string, string> = {
      amount: amount.toFixed(2),
      tax_amount: "0",
      total_amount: amount.toFixed(2),
      transaction_uuid: orderId,
      product_code: productCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: "total_amount,transaction_uuid,product_code",
    };

    fields.signature = this.generateSignature(fields);
    return fields;
  }

  generateCheckoutToken(params: {
    amount: number;
    orderId: string;
    productCode: string;
  }): string {
    const payload = `${params.orderId}:${params.amount.toFixed(2)}:${params.productCode}`;
    return crypto.createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  isValidCheckoutToken(params: {
    amount: number;
    orderId: string;
    productCode: string;
    token: string;
  }): boolean {
    const expected = this.generateCheckoutToken(params);
    const provided = Buffer.from(params.token);
    const expectedBuffer = Buffer.from(expected);
    return (
      provided.length === expectedBuffer.length &&
      crypto.timingSafeEqual(provided, expectedBuffer)
    );
  }

  /**
   * Verify eSewa payment response v2 (HTTP check to eSewa API)
   */
  async getPaymentStatus(params: {
    totalAmount: number;
    transactionUuid: string;
    productCode: string;
  }): Promise<{ status: string; refId?: string }> {
    const { totalAmount, transactionUuid, productCode } = params;

    const baseUrl = this.testMode
      ? "https://rc.esewa.com.np/api/epay/transaction/status/"
      : "https://epay.esewa.com.np/api/epay/transaction/status/";

    const url = new URL(baseUrl);
    url.searchParams.append("product_code", productCode);
    url.searchParams.append("total_amount", totalAmount.toFixed(2));
    url.searchParams.append("transaction_uuid", transactionUuid);

    try {
      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text();
        console.error(`eSewa status API failed: status ${res.status}, response: ${text}`);
        return { status: "UNKNOWN" };
      }

      const data = (await res.json()) as any;
      return {
        status: String(data?.status || "UNKNOWN"),
        refId: data?.ref_id ? String(data.ref_id) : undefined,
      };
    } catch (error) {
      console.error("eSewa status check failed:", error);
      return { status: "UNKNOWN" };
    }
  }

  async verifyPaymentv2(params: {
    totalAmount: number;
    transactionUuid: string;
    productCode: string;
  }): Promise<boolean> {
    const result = await this.getPaymentStatus(params);
    return result.status === "COMPLETE";
  }

}
