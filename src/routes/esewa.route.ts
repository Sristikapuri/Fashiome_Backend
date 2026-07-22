import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { EsewaController } from "../controllers/esewa.controller";

const router = Router();
const controller = new EsewaController();

router.get("/checkout", (req, res) => controller.checkout(req, res));
router.get("/payment-url", authorizedMiddleware, (req, res) => controller.getPaymentUrl(req, res));
router.post("/verify", authorizedMiddleware, (req, res) => controller.verifyPayment(req, res));

export default router;
