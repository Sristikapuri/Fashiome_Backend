import dotenv from "dotenv";
dotenv.config({ quiet: true });

export const PORT: number = Number(process.env.PORT) || 8089;
export const MONGODB_URL: string =
  process.env.MONGO_URI || "mongodb://localhost:27017/fashiome-db";
export const SECRET_KEY: string =
  process.env.JWT_SECRET || "fashiome-secret-key";
export const GEMINI_API_KEY: string =
  process.env.GEMINI_API_KEY || "";
export const OPENAI_API_KEY: string =
  process.env.OPENAI_API_KEY || "";

/**
 * Resolve the frontend origin used to build outbound links (password reset,
 * eSewa redirects, etc). Falls back to localhost only outside production —
 * in production a missing FRONTEND_URL fails loudly instead of silently
 * sending every user a link to localhost.
 */
export function getFrontendUrl(): string {
  const configured = process.env.FRONTEND_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("FRONTEND_URL must be configured for a production deployment.");
  }

  return "http://localhost:3000";
}

export function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "FRONTEND_URL",
    "ALLOWED_ORIGINS",
    "PUBLIC_API_URL",
    "EMAIL_HOST",
    "EMAIL_USER",
    "EMAIL_PASSWORD",
    "EMAIL_FROM",
    "ESEWA_MERCHANT_CODE",
    "ESEWA_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());

  const jwtSecret = process.env.JWT_SECRET || "";
  if (
    jwtSecret === "fashiome-secret-key" ||
    jwtSecret === "your-secret-key-here"
  ) {
    missing.push("JWT_SECRET (must be replaced with a unique secret)");
  }

  if (process.env.GEMINI_API_KEY === "your-gemini-api-key-here") {
    missing.push("GEMINI_API_KEY (must be replaced with a real key)");
  }
  if (process.env.OPENAI_API_KEY === "your-openai-api-key-here") {
    missing.push("OPENAI_API_KEY (must be replaced with a real key)");
  }
  if (process.env.ESEWA_SECRET === "your-esewa-secret") {
    missing.push("ESEWA_SECRET (must be replaced with the merchant secret)");
  }

  for (const name of ["FRONTEND_URL", "PUBLIC_API_URL"]) {
    const value = process.env[name];
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") missing.push(`${name} (must use HTTPS)`);
    } catch {
      missing.push(`${name} (must be a valid URL)`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Production configuration is incomplete or unsafe. Fix: ${[
        ...new Set(missing),
      ].join(", ")}`
    );
  }
}
