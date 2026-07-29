import nodemailer, { Transporter } from "nodemailer";

export class EmailService {
  private transporter: Transporter;
  private readonly isConfigured: boolean;

  constructor() {
    const host = process.env.EMAIL_HOST?.trim() || "smtp.gmail.com";
    const user = process.env.EMAIL_USER?.trim();
    const password = process.env.EMAIL_PASSWORD?.trim();
    const port = Number(process.env.EMAIL_PORT) || 587;

    this.isConfigured = Boolean(user && password);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
  }

  async sendOrderConfirmation(data: {
    to: string;
    customerName: string;
    orderId: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    shippingAddress: string;
  }) {
    const { to, customerName, orderId, total, items, shippingAddress } = data;

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            ${item.name}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
            Rs. ${item.price.toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #820000; padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px;">FashioMe</h1>
            <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Order Confirmation</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Dear <strong>${customerName}</strong>,</p>
            <p style="font-size: 16px;">Thank you for your order! We're pleased to confirm that we've received your order.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #820000;">Order Details</h3>
              <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderId.slice(-8)}</p>
              <p style="margin: 5px 0;"><strong>Shipping Address:</strong> ${shippingAddress}</p>
            </div>
            
            <h3 style="margin: 20px 0 10px 0; color: #820000;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
              <thead>
                <tr style="background-color: #820000; color: #fff;">
                  <th style="padding: 12px; text-align: left;">Product</th>
                  <th style="padding: 12px; text-align: center;">Quantity</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #820000;">
              <p style="font-size: 20px; font-weight: bold; color: #820000; margin: 0;">
                Total: Rs. ${total.toFixed(2)}
              </p>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              You can track your order status in your dashboard under "My Orders".
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                If you have any questions, please contact our support team.
              </p>
              <p style="font-size: 14px; color: #666; margin: 5px 0;">
                Email: <a href="mailto:support@fashiome.com" style="color: #820000;">support@fashiome.com</a>
              </p>
            </div>
          </div>
          
          <div style="background-color: #820000; padding: 20px; text-align: center;">
            <p style="color: #fff; margin: 0; font-size: 14px;">© 2024 FashioMe. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"FashioMe" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: `Order Confirmation - Order #${orderId.slice(-8)}`,
        html,
      });
      
      console.log(`Order confirmation email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendPasswordReset(to: string, resetLink: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #820000; padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px;">FashioMe</h1>
            <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px;">You requested a password reset for your FashioMe account.</p>
            <p style="font-size: 16px;">Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background-color: #820000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
          </div>
          
          <div style="background-color: #820000; padding: 20px; text-align: center;">
            <p style="color: #fff; margin: 0; font-size: 14px;">© 2024 FashioMe. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.isConfigured) {
      console.error(
        "Password reset email was not sent: configure EMAIL_USER and EMAIL_PASSWORD"
      );
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"FashioMe" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: "Password Reset - FashioMe",
        html,
      });
      
      console.log(`Password reset email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }
}
