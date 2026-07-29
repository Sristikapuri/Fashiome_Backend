import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { HttpException } from "../exceptions/http-exception";
import fs from "fs";
import { cloudStorageEnabled, uploadMedia } from "../services/media-storage.service";

const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    const uploadPath = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const fileSuffix = randomUUID();
    cb(null, fileSuffix + "-" + file.originalname);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/webp"
  ) {
    cb(null, true);
  } else {
    cb(new HttpException(400, "Only JPEG, JPG, PNG and WEBP files are allowed"));
  }
};

const upload = multer({
  storage: cloudStorageEnabled ? multer.memoryStorage() : storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB limit
  },
  fileFilter,
});

const persistToCloud = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [];
    const candidates = req.file ? [req.file] : files;
    for (const file of candidates) {
      if (!file.buffer) continue;
      const uploaded = await uploadMedia(file.buffer, file.originalname);
      file.path = uploaded.url;
      file.filename = uploaded.publicId;
    }
    next();
  } catch (error) { next(error); }
};

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Chains a list of Express middlewares into a single callable middleware.
 * `uploads.single`/`array`/`fields` need to run the multer handler and then
 * `persistToCloud` in sequence; some call sites invoke the result directly
 * as `uploadX(req, res, cb)` (e.g. inside a `req.is("multipart/form-data")`
 * branch) rather than passing it to Express as a middleware list, so the
 * returned value must itself be callable — not just an array.
 */
function composeMiddleware(middlewares: Middleware[]): Middleware {
  return (req, res, done) => {
    let index = 0;
    const runNext: NextFunction = (err) => {
      if (err) return done(err);
      const middleware = middlewares[index++];
      if (!middleware) return done();
      middleware(req, res, runNext);
    };
    runNext();
  };
}

export const uploads = {
  single: (fieldName: string) => composeMiddleware([upload.single(fieldName), persistToCloud]),
  array: (fieldName: string, maxCount: number) =>
    composeMiddleware([upload.array(fieldName, maxCount), persistToCloud]),
  fields: (fieldsArray: { name: string; maxCount?: number }[]) =>
    composeMiddleware([upload.fields(fieldsArray), persistToCloud]),
};
