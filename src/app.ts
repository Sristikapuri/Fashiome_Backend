import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.middleware";
import userRoutes from "./routes/user.route";
import uploadRoutes from "./routes/upload.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import silhouetteRoutes from "./routes/silhouette.routes";
import homeRoutes from "./routes/home.routes";
import adminUserRoutes from "./routes/admin-user.route";
import path from "path";

const app: Application = express();


app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/onboarding", onboardingRoutes);
app.use("/api/v1/silhouette", silhouetteRoutes);
app.use("/api/v1/home", homeRoutes);
app.use("/api/v1/admin", adminUserRoutes);


app.get("/", (req, res) => {
  res.send(" Backend is running successfully");
});


app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "API not found" });
});

app.use(errorMiddleware);

export default app;
