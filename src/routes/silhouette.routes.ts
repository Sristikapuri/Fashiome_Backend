import { SilhouetteController } from "../controllers/silhouette.controller";
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const silhouetteController = new SilhouetteController();

// All routes require authentication
router.get("/profile", authMiddleware, (req, res) => silhouetteController.getSilhouetteProfile(req, res));
router.post("/profile", authMiddleware, (req, res) => silhouetteController.saveSilhouetteProfile(req, res));
router.delete("/profile", authMiddleware, (req, res) => silhouetteController.clearSilhouetteProfile(req, res));

export default router;
