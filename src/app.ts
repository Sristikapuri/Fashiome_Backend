import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import uploadRoutes from "./routes/upload.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import silhouetteRoutes from "./routes/silhouette.routes";
import homeRoutes from "./routes/home.routes";
import path from "path";

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/silhouette", silhouetteRoutes);
app.use("/api/v1/home", homeRoutes);

// Test route
app.get("/", (req, res) => {
  res.send(" Backend is running successfully");
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "API not found" });
});

// Global error handler (must be last)
app.use(errorMiddleware);

export default app;
