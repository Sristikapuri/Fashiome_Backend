import dotenv from "dotenv";
dotenv.config();

export const PORT: number = Number(process.env.PORT) || 8089;
export const MONGODB_URL: string =
  process.env.MONGO_URI || "mongodb://localhost:27017/fashiome-db";
export const SECRET_KEY: string =
  process.env.JWT_SECRET || "fashiome-secret-key";
export const GEMINI_API_KEY: string =
  process.env.GEMINI_API_KEY || "";
