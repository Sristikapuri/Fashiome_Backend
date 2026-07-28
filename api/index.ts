import mongoose from "mongoose";
import app from "../src/app";
import { connectToMongoDB } from "../src/database/mongodb";
import { validateProductionEnvironment } from "../src/configs/constant";

let connectionPromise: Promise<void> | null = null;

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    validateProductionEnvironment();
    connectionPromise = connectToMongoDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  await connectionPromise;
}

export default async function handler(req: any, res: any) {
  await ensureDbConnected();
  return (app as any)(req, res);
}
