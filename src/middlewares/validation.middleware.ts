import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiResponseHelper } from "../utils/apihelper.util";

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationResult = schema.safeParse(req.body);

    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.map((issue: any) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return ApiResponseHelper.error(res, "Validation failed", 400, { errors: errorDetails });
    }

    req.body = validationResult.data;
    next();
  };
};
