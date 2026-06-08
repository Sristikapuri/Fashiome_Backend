import { UserService } from "../services/user.service";
import { z } from "zod";
import { UserRegistrationDTO, UserAuthenticationDTO } from "../dtos/user.dto";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";

const userService = new UserService();

export class UserController {
  async registerUser(req: Request, res: Response) {
    try {
      const validationResult = UserRegistrationDTO.safeParse(req.body);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return ApiResponseHelper.error(res, "Validation failed", 400, { errors: errorDetails });
      }
      const newUser = await userService.registerUser(validationResult.data);
      const { password, ...sanitizedUser } = newUser.toObject();
      return ApiResponseHelper.success(res, sanitizedUser, "User registration completed", 201);
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Registration failed due to server error",
        error.status || 500
      );
    }
  }

  async authenticateUser(req: Request, res: Response) {
    try {
      const validationResult = UserAuthenticationDTO.safeParse(req.body);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return ApiResponseHelper.error(res, "Authentication validation failed", 400, { errors: errorDetails });
      }
      const { user, token } = await userService.authenticateUser(validationResult.data);
      const { password, ...sanitizedUser } = user.toObject();
      return ApiResponseHelper.success(res, { user: sanitizedUser, token }, "User authenticated successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Authentication failed due to server error",
        error.status || 500
      );
    }
  }
}
