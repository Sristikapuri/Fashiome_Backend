import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { StripeController } from "../controllers/stripe.controller";

const router = Router();
const controller = new StripeController();

router.post("/payment-intent", authorizedMiddleware, (req, res) => controller.createPaymentIntent(req, res));
router.post("/verify", authorizedMiddleware, (req, res) => controller.verifyPayment(req, res));

export default router;
