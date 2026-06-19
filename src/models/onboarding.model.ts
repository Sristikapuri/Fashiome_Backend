import mongoose, { Schema, Document } from "mongoose";
import { OnboardingType } from "../types/onboarding.type";

export interface IOnboarding extends OnboardingType, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingMongoSchema: Schema = new Schema<IOnboarding>(
  {
    userId: { type: String, required: true, unique: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    preferences: {
      style: { type: String },
      size: { type: String },
      color: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

export const OnboardingModel = mongoose.model<IOnboarding>("Onboarding", OnboardingMongoSchema);
