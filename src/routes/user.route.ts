import { UserController } from "../controllers/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploads } from "../middlewares/upload.middleware";

const router = Router();
const userController = new UserController();

router.post("/register", (req, res) => userController.registerUser(req, res));
router.post("/login", (req, res) => userController.authenticateUser(req, res));
router.get("/whoami", authorizedMiddleware, (req, res) => userController.whoami(req, res));

// Handle both with and without file upload
router.put("/update", authorizedMiddleware, (req, res) => {
  // If content-type is multipart/form-data, use multer
  if (req.is('multipart/form-data')) {
    return uploads.fields([
      { name: "image", maxCount: 1 },
      { name: "profileImage", maxCount: 1 },
    ])(req, res, () => userController.updateLoggedInUser(req, res));
  }
  // Otherwise, process directly
  return userController.updateLoggedInUser(req, res);
});

export default router;
