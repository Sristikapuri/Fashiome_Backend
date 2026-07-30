import mongoose, { Schema, Document } from "mongoose";
import { UserType } from "../types/user.type";

export interface IUser extends UserType, Document {
  _id: mongoose.Types.ObjectId;
  resetPasswordOTP?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  wishlist: mongoose.Types.ObjectId[];
}

const UserMongoSchema: Schema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    age: { type: Number, required: true, min: 1, max: 100 },
    profileImage: { type: String },
    notificationsEnabled: { type: Boolean, default: true },
    styleArchive: {
      type: [
        {
          weekKey: { type: String, required: true },
          day: { type: String, required: true },
          occasion: { type: String, required: true },
          title: { type: String },
          outfit: { type: String },
          imageUrl: { type: String },
          explanation: { type: String },
          paletteLabels: { type: [String], default: [] },
          wardrobeItemsUsed: { type: [String], default: [] },
          updatedAt: { type: String },
        },
      ],
      default: [],
    },
    wishlist: { type: [Schema.Types.ObjectId], ref: "Clothe", default: [] },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true, // createdAt and updatedAt will be automatically added and managed by mongoose
  }
);

export const UserModel = mongoose.model<IUser>("User", UserMongoSchema);
