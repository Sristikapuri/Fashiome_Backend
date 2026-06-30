import mongoose, { Document, Schema } from "mongoose";

export interface IClothe extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category:
    | "tops"
    | "bottoms"
    | "shoes"
    | "accessories"
    | "dresses"
    | "outerwear"
    | "shirts"
    | "sweaters"
    | "pants"
    | "skirts"
    | "activewear";
  size: string;
  color: string;
  price: number;
  discountedPrice?: number;
  stock: number;
  imageUrl: string;
  description: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const ClothesSchema: Schema = new Schema<IClothe>(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "tops",
        "bottoms",
        "shoes",
        "accessories",
        "dresses",
        "outerwear",
        "shirts",
        "sweaters",
        "pants",
        "skirts",
        "activewear",
      ],
      required: true,
    },
    size: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0, default: null },
    stock: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true,
  }
);

export const ClothesModel = mongoose.model<IClothe>("Clothe", ClothesSchema);
