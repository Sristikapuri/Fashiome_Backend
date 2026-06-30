import mongoose, { Schema, Document } from "mongoose";
import { SilhouetteType } from "../types/silhouette.type";

export interface ISilhouette extends SilhouetteType, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SilhouetteMongoSchema: Schema = new Schema<ISilhouette>(
  {
    userId: { type: String, required: true, unique: true },
    gender: { type: String },
    bodyType: { type: String },
    height: { type: Number },
    weight: { type: Number },
    skinTone: { type: String },
    skinToneHex: { type: String },
    faceShape: { type: String },
    measurements: {
      chest: { type: Number },
      waist: { type: Number },
      hips: { type: Number },
      shoulders: { type: Number },
    },
    stylePreferences: [{ type: String }],
    completed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const SilhouetteModel = mongoose.model<ISilhouette>("Silhouette", SilhouetteMongoSchema);
