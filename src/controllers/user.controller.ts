import { UserService } from "../services/user.service";
import { z } from "zod";
import { UserRegistrationDTO, UserAuthenticationDTO } from "../dtos/user.dto";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";

const userService = new UserService();

const getStringParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new HttpException(400, `Invalid ${name} parameter`);
};

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

  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await userService.getAllUsers();
      const sanitizedUsers = users.map(user => {
        const { password, ...sanitized } = user.toObject();
        return sanitized;
      });
      return ApiResponseHelper.success(res, sanitizedUsers, "Users retrieved successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to retrieve users",
        error.status || 500
      );
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const user = await userService.getUserById(id);
      if (!user) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }
      const { password, ...sanitizedUser } = user.toObject();
      return ApiResponseHelper.success(res, sanitizedUser, "User retrieved successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to retrieve user",
        error.status || 500
      );
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const updatedUser = await userService.updateUser(id, req.body);
      if (!updatedUser) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }
      const { password, ...sanitizedUser } = updatedUser.toObject();
      return ApiResponseHelper.success(res, sanitizedUser, "User updated successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to update user",
        error.status || 500
      );
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const deleted = await userService.deleteUser(id);
      if (!deleted) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }
      return ApiResponseHelper.success(res, null, "User deleted successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to delete user",
        error.status || 500
      );
    }
  }
}
