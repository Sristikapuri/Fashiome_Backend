export class KhaltiService {
  private secretKey: string;
  private testMode: boolean;

  constructor() {
    this.secretKey = process.env.KHALTI_SECRET_KEY || "";
    this.testMode = process.env.NODE_ENV !== "production";
  }

  private getBaseUrl(): string {
    return this.testMode
      ? "https://dev.khalti.com/api/v2/"
      : "https://khalti.com/api/v2/";
  }

  async initiate(params: {
    amount: number;
    orderId: string;
    returnUrl: string;
    websiteUrl: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }): Promise<{ pidx: string; paymentUrl: string }> {
    const { amount, orderId, returnUrl, websiteUrl, customerName, customerEmail, customerPhone } = params;

    const response = await fetch(`${this.getBaseUrl()}epayment/initiate/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Khalti expects the amount in paisa (1 rupee = 100 paisa).
        amount: Math.round(amount * 100),
        purchase_order_id: orderId,
        purchase_order_name: `FashioMe Order ${orderId}`,
        return_url: returnUrl,
        website_url: websiteUrl,
        customer_info: {
          name: customerName || "FashioMe Customer",
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Khalti initiate failed: status ${response.status}, response: ${text}`);
    }

    const data = (await response.json()) as { pidx?: string; payment_url?: string };
    if (!data.pidx || !data.payment_url) {
      throw new Error("Khalti initiate response missing pidx/payment_url");
    }

    return { pidx: data.pidx, paymentUrl: data.payment_url };
  }

  async lookup(pidx: string): Promise<{
    status: string;
    transactionId?: string;
    totalAmount?: number;
  }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}epayment/lookup/`, {
        method: "POST",
        headers: {
          Authorization: `Key ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pidx }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Khalti lookup failed: status ${response.status}, response: ${text}`);
        return { status: "UNKNOWN" };
      }

      const data = (await response.json()) as {
        status?: string;
        transaction_id?: string;
        total_amount?: number;
      };

      return {
        status: String(data.status || "UNKNOWN"),
        transactionId: data.transaction_id,
        totalAmount: data.total_amount,
      };
    } catch (error) {
      console.error("Khalti lookup failed:", error);
      return { status: "UNKNOWN" };
    }
  }
}
