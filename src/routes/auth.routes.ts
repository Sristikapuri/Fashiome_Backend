import { UserController } from "../controllers/user.controller";
import { Router } from "express";

const router = Router();
const userController = new UserController();

router.post("/register", (req, res) => userController.registerUser(req, res));
router.post("/login", (req, res) => userController.authenticateUser(req, res));

export default router;
