import mongoose, { Document, Schema } from "mongoose";

export type ClothingCategory =
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
  | "activewear"
  | "gown"
  | "party-wear"
  | "streetwear"
  | "formal-wear"
  | "traditional"
  | "lingerie";

export type ClothingGender = "male" | "female" | "unisex";

export interface IClothe extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: ClothingCategory;
  gender: ClothingGender;
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

const CLOTHING_CATEGORIES: ClothingCategory[] = [
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
  "gown",
  "party-wear",
  "streetwear",
  "formal-wear",
  "traditional",
  "lingerie",
];

const ClothesSchema: Schema = new Schema<IClothe>(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: CLOTHING_CATEGORIES,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "unisex"],
      default: "unisex",
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
