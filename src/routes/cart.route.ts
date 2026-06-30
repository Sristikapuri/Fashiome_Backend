import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { CartController } from "../controllers/cart.controller";

const router = Router();
const controller = new CartController();

router.get("/", authorizedMiddleware, (req, res) => controller.getCart(req, res));
router.put("/", authorizedMiddleware, (req, res) => controller.setCart(req, res));

export default router;
