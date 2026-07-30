import express, { Application, Request, Response } from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.middleware";
import userRoutes from "./routes/user.route";
import uploadRoutes from "./routes/upload.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import silhouetteRoutes from "./routes/silhouette.routes";
import homeRoutes from "./routes/home.routes";
import homeClothesRoutes from "./routes/home-clothes.route";
import adminUserRoutes from "./routes/admin-user.route";
import adminClothesRoutes from "./routes/admin-clothes.route";
import adminOrderRoutes from "./routes/admin-order.route";
import cartRoutes from "./routes/cart.route";
import orderRoutes from "./routes/order.route";
import esewaRoutes from "./routes/esewa.route";
import reviewRoutes from "./routes/review.route";
import path from "path";

const app: Application = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// `flutter run -d chrome` binds a fresh random port every launch, so an exact
// allowlist match is impractical in development. Any localhost/127.0.0.1
// origin (any port) is trusted outside production instead.
const isDevLocalhostOrigin = (origin: string) =>
  process.env.NODE_ENV !== "production" &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const requestLog = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 200);

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || isDevLocalhostOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const current = requestLog.get(key);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestLog.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      statusCode: 429,
      isSuccess: false,
      responseMessage: "Too many requests. Please try again later.",
      responseData: null,
    });
  }

  current.count += 1;
  requestLog.set(key, current);
  return next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/silhouette", silhouetteRoutes);
app.use("/api/v1/home", homeRoutes);
app.use("/api/v1/home", homeClothesRoutes);
app.use("/api/v1/admin", adminUserRoutes);
app.use("/api/v1/admin", adminClothesRoutes);
app.use("/api/v1/admin", adminOrderRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/esewa", esewaRoutes);
app.use("/api/v1/reviews", reviewRoutes);


app.get("/", (req, res) => {
  res.send(" Backend is running successfully");
});


app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "API not found" });
});

app.use(errorMiddleware);

export default app;
