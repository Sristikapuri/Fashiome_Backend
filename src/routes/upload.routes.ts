import { Router } from "express";
import { uploads } from "../middlewares/upload.middleware";
import { HttpException } from "../exceptions/http-exception";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { cloudStorageEnabled } from "../services/media-storage.service";

const router = Router();


router.post("/upload-photo", authorizedMiddleware, uploads.single("image"), (req, res) => {
  try {
    if (!req.file) {
      throw new HttpException(400, "No file uploaded");
    }
    
    const fileUrl = cloudStorageEnabled
      ? req.file.path
      : `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    const relativeFileUrl = cloudStorageEnabled ? req.file.path : `/uploads/${req.file.filename}`;
    return ApiResponseHelper.success(
      res,
      { fileUrl, relativeFileUrl, filename: req.file.filename },
      "File uploaded successfully"
    );
  } catch (error: unknown) {
    return ApiResponseHelper.error(res, getErrorMessage(error, "Upload failed"), getErrorStatus(error));
  }
});


export default router;
