import { UserService } from "../services/user.service";
import { AdminUserCreateDTO, AdminUserUpdateDTO } from "../dtos/user.dto";
import { ApiResponseHelper, getErrorMessage, getErrorStatus } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";
import { IUser } from "../models/user.model";

const userService = new UserService();

const getStringParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new HttpException(400, `Invalid ${name} parameter`);
};

const getNumberParam = (value: string | string[] | undefined, name: string) => {
  const num = typeof value === "string" ? parseInt(value, 10) : NaN;
  if (!isNaN(num) && num > 0) {
    return num;
  }

  throw new HttpException(400, `Invalid ${name} parameter`);
};

const getUploadedProfileImage = (req: Request) => {
  const file = req.file as Express.Multer.File | undefined;
  const fileGroups = req.files as Record<string, Express.Multer.File[]> | undefined;
  return fileGroups?.profileImage?.[0] || file;
};

export class AdminUserController {
  private sanitizeUser(user: IUser) {
    const { password, ...sanitizedUser } = user.toObject();
    return sanitizedUser;
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const page = req.query.page ? getNumberParam(req.query.page as string | string[], "page") : 1;
      const limit = req.query.limit ? getNumberParam(req.query.limit as string | string[], "limit") : 10;
      const search = req.query.search as string | undefined;

      const { users, total } = await userService.getPaginatedUsers(page, limit, search);
      const sanitizedUsers = users.map(user => this.sanitizeUser(user));

      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        statusCode: 200,
        isSuccess: true,
        responseMessage: "Users retrieved successfully",
        responseData: {
          data: sanitizedUsers,
          meta: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve users"),
        getErrorStatus(error)
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
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to retrieve user"),
        getErrorStatus(error)
      );
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const validationResult = AdminUserCreateDTO.safeParse(req.body);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return ApiResponseHelper.error(res, "Validation failed", 400, { errors: errorDetails });
      }
      const newUser = await userService.registerUser(validationResult.data);
      return ApiResponseHelper.success(res, this.sanitizeUser(newUser), "User created successfully", 201);
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to create user"),
        getErrorStatus(error)
      );
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const id = getStringParam(req.params.id, "id");
      const file = getUploadedProfileImage(req);
      const payload = {
        ...req.body,
        ...(req.body?.age ? { age: Number(req.body.age) } : {}),
        ...(file ? { profileImage: file.path || `/uploads/${file.filename}` } : {}),
      };
      const validationResult = AdminUserUpdateDTO.safeParse(payload);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((issue) => ({
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
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to update user"),
        getErrorStatus(error)
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
    } catch (error: unknown) {
      return ApiResponseHelper.error(
        res,
        getErrorMessage(error, "Failed to delete user"),
        getErrorStatus(error)
      );
    }
  }

}
