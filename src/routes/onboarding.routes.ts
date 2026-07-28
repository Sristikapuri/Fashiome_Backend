import { OnboardingController } from "../controllers/onboarding.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const router = Router();
const onboardingController = new OnboardingController();


router.get("/status", authorizedMiddleware, (req, res) => onboardingController.getOnboardingStatus(req, res));
router.post("/complete", authorizedMiddleware, (req, res) => onboardingController.completeOnboarding(req, res));

export default router;
