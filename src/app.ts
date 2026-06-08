import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);

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