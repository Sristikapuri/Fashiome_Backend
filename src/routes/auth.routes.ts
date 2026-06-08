import { UserController } from "../controllers/user.controller";
import { Router } from "express";

const router = Router();
const userController = new UserController();

router.post("/register", (req, res) => userController.createUser(req, res));
router.post("/login", (req, res) => userController.loginUser(req, res));

export default router;
