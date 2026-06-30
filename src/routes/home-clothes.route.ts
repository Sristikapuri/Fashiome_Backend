import { Router } from "express";
import { HomeClothesController } from "../controllers/home-clothes.controller";

const router = Router();
const controller = new HomeClothesController();

router.get("/clothes/:id", (req, res) => controller.getById(req, res));
router.get("/clothes", (req, res) => controller.getCatalog(req, res));

export default router;
