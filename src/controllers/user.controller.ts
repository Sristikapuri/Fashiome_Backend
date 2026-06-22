import { UserService } from "../services/user.service";
import { z } from "zod";
import { UserRegistrationDTO, UserAuthenticationDTO, UserUpdateDTO } from "../dtos/user.dto";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";

const userService = new UserService();

const getStringParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new HttpException(400, `Invalid ${name} parameter`);
};

const getAuthenticatedUserId = (req: AuthRequest) => {
  const id = req.user?._id?.toString();

  if (!id) {
    throw new HttpException(401, "Unauthorized user not found");
  }

  return id;
};

const getUploadedProfileImage = (req: Request) => {
  const fileGroups = req.files as Record<string, Express.Multer.File[]> | undefined;
  return fileGroups?.profileImage?.[0] || fileGroups?.image?.[0] || req.file;
};

export class UserController {
  private sanitizeUser(user: any) {
    const { password, ...sanitizedUser } = user.toObject();
    return sanitizedUser;
  }

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
      return ApiResponseHelper.success(res, this.sanitizeUser(newUser), "User registration completed", 201);
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
      return ApiResponseHelper.success(res, { user: this.sanitizeUser(user), token }, "User authenticated successfully");
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
        return this.sanitizeUser(user);
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
      return ApiResponseHelper.success(res, this.sanitizeUser(user), "User retrieved successfully");
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
      const validationResult = UserUpdateDTO.safeParse(req.body);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return ApiResponseHelper.error(res, "Validation failed", 400, { errors: errorDetails });
      }
      const updatedUser = await userService.updateUser(id, validationResult.data);
      if (!updatedUser) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }
      return ApiResponseHelper.success(res, this.sanitizeUser(updatedUser), "User updated successfully");
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

  async whoami(req: AuthRequest, res: Response) {
    try {
      const user = await userService.getUserById(getAuthenticatedUserId(req));
      if (!user) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }
      return ApiResponseHelper.success(res, this.sanitizeUser(user), "Logged in user retrieved successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to retrieve logged in user",
        error.status || 500
      );
    }
  }

  async updateLoggedInUser(req: AuthRequest, res: Response) {
    try {
      console.log("🔥 UPDATE PROFILE - req.body:", req.body);
      console.log("🔥 UPDATE PROFILE - req.files:", req.files);
      
      const file = getUploadedProfileImage(req);
      const payload = {
        ...req.body,
        ...(req.body.age ? { age: Number(req.body.age) } : {}),
        ...(file ? { profileImage: `/uploads/${file.filename}` } : {}),
      };
      
      console.log("🔥 UPDATE PROFILE - payload:", payload);
      
      const validationResult = UserUpdateDTO.safeParse(payload);
      if (!validationResult.success) {
        console.log("🔥 UPDATE PROFILE - Validation failed:", validationResult.error);
        const errorDetails = validationResult.error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return ApiResponseHelper.error(res, "Validation failed", 400, { errors: errorDetails });
      }

      const updatedUser = await userService.updateUser(getAuthenticatedUserId(req), validationResult.data);
      if (!updatedUser) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }
      return ApiResponseHelper.success(res, this.sanitizeUser(updatedUser), "User updated successfully");
    } catch (error: Error | any) {
      console.log("🔥 UPDATE PROFILE - Error:", error);
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to update user",
        error.status || 500
      );
    }
  }
}
