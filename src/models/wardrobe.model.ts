import mongoose, { Document, Schema } from "mongoose";

export interface IWardrobeItem {
  id: string;
  title: string;
  category: string;
  tag: string;
  imageUrl: string;
  outfit: string;
  hairstyle: string;
  explanation: string;
  palette: number[];
  paletteLabels: string[];
  savedAt: string;
  isFavorite: boolean;
  entryType: string;
}

export interface IWardrobeCollection extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  items: IWardrobeItem[];
  createdAt: Date;
  updatedAt: Date;
}

const WardrobeItemSchema = new Schema<IWardrobeItem>(
  {
    id: { type: String, required: true },
    title: { type: String, default: "" },
    category: { type: String, default: "" },
    tag: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    outfit: { type: String, default: "" },
    hairstyle: { type: String, default: "" },
    explanation: { type: String, default: "" },
    palette: [{ type: Number }],
    paletteLabels: [{ type: String }],
    savedAt: { type: String, default: "" },
    isFavorite: { type: Boolean, default: false },
    entryType: { type: String, default: "look" },
  },
  { _id: false }
);

const WardrobeCollectionSchema = new Schema<IWardrobeCollection>(
  {
    userId: { type: String, required: true, unique: true },
    items: { type: [WardrobeItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const WardrobeCollectionModel = mongoose.model<IWardrobeCollection>(
  "WardrobeCollection",
  WardrobeCollectionSchema
);
