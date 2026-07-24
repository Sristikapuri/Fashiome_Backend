import { SilhouetteController } from "../controllers/silhouette.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const router = Router();
const silhouetteController = new SilhouetteController();


router.get("/profile", authorizedMiddleware, (req, res) => silhouetteController.getSilhouetteProfile(req, res));
router.post("/profile", authorizedMiddleware, (req, res) => silhouetteController.saveSilhouetteProfile(req, res));
router.delete("/profile", authorizedMiddleware, (req, res) => silhouetteController.clearSilhouetteProfile(req, res));

export default router;
