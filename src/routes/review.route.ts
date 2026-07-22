import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { ReviewController } from "../controllers/review.controller";

const router = Router();
const controller = new ReviewController();

router.post("/", authorizedMiddleware, (req, res) => controller.createReview(req, res));
router.get("/clothe/:clotheId", (req, res) => controller.getReviewsByClothe(req, res));
router.get("/my", authorizedMiddleware, (req, res) => controller.getMyReviews(req, res));
router.put("/:id", authorizedMiddleware, (req, res) => controller.updateReview(req, res));
router.delete("/:id", authorizedMiddleware, (req, res) => controller.deleteReview(req, res));

export default router;
