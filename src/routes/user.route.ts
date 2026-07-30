import { UserController } from "../controllers/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { uploads } from "../middlewares/upload.middleware";

const router = Router();
const userController = new UserController();

router.post("/register", (req, res) => userController.registerUser(req, res));
router.post("/login", (req, res) => userController.authenticateUser(req, res));
router.post("/forgot-password", (req, res) => userController.forgotPassword(req, res));
router.post("/reset-password", (req, res) => userController.resetPassword(req, res));
router.get("/whoami", authorizedMiddleware, (req, res) => userController.whoami(req, res));
router.get("/style-archive", authorizedMiddleware, (req, res) => userController.getStyleArchive(req, res));
router.post("/style-archive", authorizedMiddleware, (req, res) => userController.upsertStyleArchiveEntry(req, res));
router.get("/wishlist", authorizedMiddleware, (req, res) => userController.getWishlist(req, res));
router.patch("/wishlist/:clotheId", authorizedMiddleware, (req, res) => userController.toggleWishlist(req, res));


router.put("/update", authorizedMiddleware, (req, res) => {

  if (req.is('multipart/form-data')) {
    return uploads.fields([
      { name: "image", maxCount: 1 },
      { name: "profileImage", maxCount: 1 },
    ])(req, res, () => userController.updateLoggedInUser(req, res));
  }
  
  return userController.updateLoggedInUser(req, res);
});

router.delete("/delete", authorizedMiddleware, (req, res) => userController.deleteLoggedInUser(req, res));

export default router;
