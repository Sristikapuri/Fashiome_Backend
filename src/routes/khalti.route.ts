import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { KhaltiController } from "../controllers/khalti.controller";

const router = Router();
const controller = new KhaltiController();

router.get("/payment-url", authorizedMiddleware, (req, res) => controller.getPaymentUrl(req, res));
router.post("/verify", authorizedMiddleware, (req, res) => controller.verifyPayment(req, res));

export default router;
