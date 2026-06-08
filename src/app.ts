import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import { Router } from "express";
import { UserController } from "./controllers/user.controller";

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Controllers
const userController = new UserController();

// Routes
const authRouter = Router();

authRouter.post("/register", (req, res) =>
  userController.registerUser(req, res)
);

authRouter.post("/login", (req, res) =>
  userController.authenticateUser(req, res)
);

app.use("/api/v1/auth", authRouter);

// Test route
app.get("/", (req, res) => {
  res.send(" Backend is running successfully");
});

// Global error handler
app.use(
  (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err);
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
);

export default app;