import mongoose, { Document, Schema } from "mongoose";

export interface ICartItem {
  clotheId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema: Schema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    items: [
      {
        clotheId: { type: Schema.Types.ObjectId, ref: "Clothe", required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
      },
    ],
  },
  { timestamps: true }
);

export const CartModel = mongoose.model<ICart>("Cart", CartSchema);
