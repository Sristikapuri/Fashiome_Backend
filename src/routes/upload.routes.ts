import { Router } from "express";
import { uploads } from "../middlewares/upload.middleware";
import { HttpException } from "../exceptions/http-exception";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Single file upload endpoint
router.post("/upload-photo", authMiddleware, uploads.single("image"), (req, res) => {
  try {
    if (!req.file) {
      throw new HttpException(400, "No file uploaded");
    }
    const relativeFileUrl = `/uploads/${req.file.filename}`;
    const fileUrl = `${req.protocol}://${req.get("host")}${relativeFileUrl}`;
    return ApiResponseHelper.success(
      res,
      { fileUrl, relativeFileUrl, filename: req.file.filename },
      "File uploaded successfully"
    );
  } catch (error) {
    return ApiResponseHelper.error(res, error);
  }
});

// Video upload endpoint
router.post("/upload-video", authMiddleware, uploads.single("video"), (req, res) => {
  try {
    if (!req.file) {
      throw new HttpException(400, "No file uploaded");
    }
    const relativeFileUrl = `/uploads/${req.file.filename}`;
    const fileUrl = `${req.protocol}://${req.get("host")}${relativeFileUrl}`;
    return ApiResponseHelper.success(
      res,
      { fileUrl, relativeFileUrl, filename: req.file.filename },
      "Video uploaded successfully"
    );
  } catch (error) {
    return ApiResponseHelper.error(res, error);
  }
});

export default router;
