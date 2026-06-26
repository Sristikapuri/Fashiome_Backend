import mongoose, { Schema, Document } from "mongoose";
import { UserType } from "../types/user.type";

export interface IUser extends UserType, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
    role: { type: String, enum: ["admin", "user"], default: "user" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true, // createdAt and updatedAt will be automatically added and managed by mongoose
  }
);

export const UserModel = mongoose.model<IUser>("User", UserMongoSchema);
