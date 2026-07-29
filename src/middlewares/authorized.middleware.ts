import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../configs/constant";
import { HttpException } from "../exceptions/http-exception";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { IUser } from "../models/user.model";
import { UserMongoRepository } from "../repositories/user.repository";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const userRepository = new UserMongoRepository();

export const authorizedMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpException(401, "Unauthorized JWT invalid");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new HttpException(401, "Unauthorized JWT missing");
    }

    let decodedToken: Record<string, unknown>;
    try {
      decodedToken = jwt.verify(token, SECRET_KEY) as Record<string, unknown>;
    } catch {
      throw new HttpException(401, "Unauthorized JWT invalid or expired");
    }

    const userId =
      typeof decodedToken?.userId === "string"
        ? decodedToken.userId
        : typeof decodedToken?.id === "string"
          ? decodedToken.id
          : null;

    if (!userId) {
      throw new HttpException(401, "Unauthorized JWT unverified");
    }

    const user = await userRepository.getUserById(userId);

    if (!user) {
      throw new HttpException(401, "Unauthorized user not found");
    }

    req.user = user;
    return next();
  } catch (error: unknown) {
    return ApiResponseHelper.error(
      res,
      getErrorMessage(error, "Internal Server Error"),
      getErrorStatus(error)
    );
  }
};

export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new HttpException(401, "Unauthorized no user info");
    }

    if (req.user.role !== "admin") {
      throw new HttpException(403, "Forbidden not admin");
    }

    return next();
  } catch (error: unknown) {
    return ApiResponseHelper.error(
      res,
      getErrorMessage(error, "Internal Server Error"),
      getErrorStatus(error)
    );
  }
};
