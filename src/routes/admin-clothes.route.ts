import { Router, Request, Response, NextFunction } from "express";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";
import { AdminClothesController } from "../controllers/admin-clothes.controller";
import { uploads } from "../middlewares/upload.middleware";

const router = Router();
const controller = new AdminClothesController();
const uploadClotheImage = uploads.single("image");

const handleImageUpload = (req: Request, res: Response, next: NextFunction) => {
  if (req.is("multipart/form-data")) {
    return uploadClotheImage(req, res, (err?: unknown) => {
      if (err) {
        return next(err);
      }
      return controller.create(req, res);
    });
  }
  return controller.create(req, res);
};

const handleImageUpdate = (req: Request, res: Response, next: NextFunction) => {
  if (req.is("multipart/form-data")) {
    return uploadClotheImage(req, res, (err?: unknown) => {
      if (err) {
        return next(err);
      }
      return controller.update(req, res);
    });
  }
  return controller.update(req, res);
};

router.get("/clothes", authorizedMiddleware, adminMiddleware, (req, res) => controller.getAll(req, res));
router.get("/clothes/low-stock", authorizedMiddleware, adminMiddleware, (req, res) => controller.getLowStock(req, res));
router.get("/clothes/:id", authorizedMiddleware, adminMiddleware, (req, res) => controller.getById(req, res));
router.post("/clothes", authorizedMiddleware, adminMiddleware, handleImageUpload);
router.put("/clothes/:id", authorizedMiddleware, adminMiddleware, handleImageUpdate);
router.patch("/clothes/:id", authorizedMiddleware, adminMiddleware, handleImageUpdate);
router.delete("/clothes/:id", authorizedMiddleware, adminMiddleware, (req, res) => controller.delete(req, res));

export default router;
