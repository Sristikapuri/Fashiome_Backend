import { Router } from "express";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";
import { AdminOrderController } from "../controllers/admin-order.controller";

const router = Router();
const controller = new AdminOrderController();


router.get("/orders/stats", authorizedMiddleware, adminMiddleware, (req, res) => controller.getOrderStats(req, res));
router.get("/orders", authorizedMiddleware, adminMiddleware, (req, res) => controller.getAllOrders(req, res));
router.patch("/orders/:id/status", authorizedMiddleware, adminMiddleware, (req, res) => controller.updateOrderStatus(req, res));
router.delete("/orders/:id", authorizedMiddleware, adminMiddleware, (req, res) => controller.deleteOrder(req, res));

export default router;
