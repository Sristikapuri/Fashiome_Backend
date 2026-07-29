import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItem {
  clotheId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

/**
 * Shape accepted when creating a new order: ref fields (`userId`/`clotheId`)
 * may be passed as plain ObjectId hex strings (as they come from
 * `req`/service-layer code) since Mongoose casts them to ObjectId itself.
 */
export interface IOrderCreateInput {
  userId: string | mongoose.Types.ObjectId;
  items: { clotheId: string | mongoose.Types.ObjectId; quantity: number; price: number }[];
  shippingAddress: string;
  customerName?: string;
  customerEmail?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  paymentMethod?: string;
  esewaTransactionId?: string;
  esewaRefId?: string;
  subtotal: number;
  tax: number;
  total: number;
  status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: string;
  customerName?: string;
  customerEmail?: string;
  phone?: string;
  city?: string;
  postalCode?: string;
  paymentMethod?: string;
  esewaTransactionId?: string;
  esewaRefId?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        clotheId: { type: Schema.Types.ObjectId, ref: "Clothe", required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    shippingAddress: { type: String, required: true, trim: true },
    customerName: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    paymentMethod: { type: String, trim: true, default: "cod" },
    esewaTransactionId: { type: String, trim: true },
    esewaRefId: { type: String, trim: true },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);
