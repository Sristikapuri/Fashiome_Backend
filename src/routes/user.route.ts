import { UserController } from "../controllers/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploads } from "../middlewares/upload.middleware";

const router = Router();
const userController = new UserController();

router.post("/register", (req, res) => userController.registerUser(req, res));
router.post("/login", (req, res) => userController.authenticateUser(req, res));
router.get("/whoami", authorizedMiddleware, (req, res) => userController.whoami(req, res));
router.put(
  "/update",
  authorizedMiddleware,
  uploads.fields([
    { name: "image", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),
  (req, res) =>
  userController.updateLoggedInUser(req, res)
);

export default router;
