import { OnboardingController } from "../controllers/onboarding.controller";
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const onboardingController = new OnboardingController();

// All routes require authentication
router.get("/status", authMiddleware, (req, res) => onboardingController.getOnboardingStatus(req, res));
router.post("/complete", authMiddleware, (req, res) => onboardingController.completeOnboarding(req, res));

export default router;
