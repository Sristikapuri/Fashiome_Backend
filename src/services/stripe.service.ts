import Stripe from "stripe";

export class StripeService {
  private client: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY || "";
    this.client = new Stripe(secretKey);
  }

  async createPaymentIntent(params: {
    amount: number;
    orderId: string;
    currency?: string;
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const { amount, orderId, currency = "usd" } = params;

    const paymentIntent = await this.client.paymentIntents.create({
      // Stripe expects the amount in the currency's smallest unit
      // (cents for USD).
      amount: Math.round(amount * 100),
      currency,
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret for this payment intent");
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<{
    status: string;
    amountReceived: number;
  }> {
    const paymentIntent = await this.client.paymentIntents.retrieve(paymentIntentId);
    return {
      status: paymentIntent.status,
      amountReceived: paymentIntent.amount_received / 100,
    };
  }
}
