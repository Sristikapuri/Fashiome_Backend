import { AdminUserController } from "../controllers/admin-user.controller";
import { NextFunction, Request, Response, Router } from "express";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";
import { uploads } from "../middlewares/upload.middleware";

const router = Router();
const adminUserController = new AdminUserController();


router.get("/users", authorizedMiddleware, adminMiddleware, (req, res) => adminUserController.getAllUsers(req, res));
router.get("/users/:id", authorizedMiddleware, adminMiddleware, (req, res) => adminUserController.getUserById(req, res));
router.post("/users", authorizedMiddleware, adminMiddleware, (req, res) => adminUserController.createUser(req, res));
const uploadProfileImage = uploads.single("profileImage");

const handleUpdateUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.is("multipart/form-data")) {
    return uploadProfileImage(req, res, (err?: any) => {
      if (err) {
        return next(err);
      }

      return adminUserController.updateUser(req, res);
    });
  }

  return adminUserController.updateUser(req, res);
};

router.put("/users/:id", authorizedMiddleware, adminMiddleware, handleUpdateUser);
router.patch("/users/:id", authorizedMiddleware, adminMiddleware, handleUpdateUser);
router.delete("/users/:id", authorizedMiddleware, adminMiddleware, (req, res) => adminUserController.deleteUser(req, res));

export default router;
