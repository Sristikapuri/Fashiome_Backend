import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { OrderController } from "../controllers/order.controller";

const router = Router();
const controller = new OrderController();

router.post("/", authorizedMiddleware, (req, res) => controller.createOrder(req, res));
router.get("/me", authorizedMiddleware, (req, res) => controller.getMyOrders(req, res));
router.get("/:id", authorizedMiddleware, (req, res) => controller.getOrderById(req, res));


router.get("/esewa/verify", (req, res) => controller.verifyEsewaPayment(req, res));

export default router;
