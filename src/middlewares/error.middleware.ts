import { Request, Response, NextFunction } from "express";
import { HttpException } from "../exceptions/http-exception";
import { ApiResponseHelper } from "../utils/apihelper.util";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Error:", err);

  if (err instanceof HttpException) {
    return ApiResponseHelper.error(
      res,
      err.message,
      err.status
    );
  }

  return ApiResponseHelper.error(
    res,
    err?.message || "Internal Server Error",
    500
  );
};
