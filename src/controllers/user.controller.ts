import { UserService } from "../services/user.service";
import { z } from "zod";
import { UserRegistrationDTO, UserAuthenticationDTO, UserUpdateDTO } from "../dtos/user.dto";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authorized.middleware";
import { EmailService } from "../services/email.service";
import { UserModel } from "../models/user.model";
import bcryptjs from "bcryptjs";
import { createHash, randomInt } from "crypto";

const userService = new UserService();
const emailService = new EmailService();

const getStringParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new HttpException(400, `Invalid ${name} parameter`);
};

const getAuthenticatedUserId = (req: AuthenticatedRequest) => {
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

  async whoami(req: AuthenticatedRequest, res: Response) {
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

  async updateLoggedInUser(req: AuthenticatedRequest, res: Response) {
    try {
      const file = getUploadedProfileImage(req);
      const payload = {
        ...req.body,
        ...(req.body.age ? { age: Number(req.body.age) } : {}),
        ...(file ? { profileImage: `/uploads/${file.filename}` } : {}),
      };

      const validationResult = UserUpdateDTO.safeParse(payload);
      if (!validationResult.success) {
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
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to update user",
        error.status || 500
      );
    }
  }

  async deleteLoggedInUser(req: AuthenticatedRequest, res: Response) {
    try {
      const id = getAuthenticatedUserId(req);
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

  async getStyleArchive(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await userService.getUserById(getAuthenticatedUserId(req));
      if (!user) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }

      return ApiResponseHelper.success(res, { styleArchive: (user as any).styleArchive || [] }, "Style archive retrieved successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to retrieve style archive",
        error.status || 500
      );
    }
  }

  async upsertStyleArchiveEntry(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const { weekKey, day, occasion, title, outfit, imageUrl, explanation, paletteLabels, wardrobeItemsUsed } = req.body || {};

      if (!weekKey || !day || !occasion) {
        throw new HttpException(400, "Week key, day, and occasion are required");
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return ApiResponseHelper.error(res, "User not found", 404);
      }

      const currentArchive = Array.isArray((user as any).styleArchive) ? (user as any).styleArchive : [];
      const nextEntry = {
        weekKey,
        day,
        occasion,
        title: title || "",
        outfit: outfit || "",
        imageUrl: imageUrl || "",
        explanation: explanation || "",
        paletteLabels: Array.isArray(paletteLabels) ? paletteLabels : [],
        wardrobeItemsUsed: Array.isArray(wardrobeItemsUsed) ? wardrobeItemsUsed : [],
        updatedAt: new Date().toISOString(),
      };

      const filtered = currentArchive.filter((entry: any) => entry.weekKey !== weekKey || entry.day !== day);
      const updatedUser = await userService.updateUser(userId, {
        styleArchive: [...filtered, nextEntry],
      } as any);

      return ApiResponseHelper.success(
        res,
        { styleArchive: (updatedUser as any)?.styleArchive || [...filtered, nextEntry] },
        "Style archive updated successfully"
      );
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to update style archive",
        error.status || 500
      );
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== "string" || !email.trim()) {
        throw new HttpException(400, "Email address is required");
      }

      const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
      if (!user) {
        // Return success to prevent enumeration
        return ApiResponseHelper.success(
          res,
          null,
          "If the email is registered, a password reset link has been sent"
        );
      }

      const otp = randomInt(100000, 1000000).toString();
      const otpHash = createHash("sha256").update(otp).digest("hex");
      user.resetPasswordOTP = otpHash;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const resetLink = `${frontendUrl}/reset-password?token=${otp}&email=${encodeURIComponent(user.email)}`;

      const emailSent = await emailService.sendPasswordReset(user.email, resetLink);
      if (!emailSent) {
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        throw new HttpException(503, "Password reset email service is unavailable");
      }

      return ApiResponseHelper.success(
        res,
        null,
        "If the email is registered, a password reset link has been sent"
      );
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to initiate password reset",
        error.status || 500
      );
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { email, token: resetToken, password } = req.body || {};

      if (!email || !resetToken || !password) {
        throw new HttpException(400, "Email, reset code, and new password are required");
      }

      if (password.length < 6) {
        throw new HttpException(400, "Password must be at least 6 characters long");
      }

      const token = resetToken.trim();
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const user = await UserModel.findOne({
        email: email.trim().toLowerCase(),
        resetPasswordOTP: { $in: [tokenHash, token] },
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new HttpException(400, "Invalid or expired reset code");
      }

      const hashedPassword = await bcryptjs.hash(password, 10);
      user.password = hashedPassword;
      user.resetPasswordOTP = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return ApiResponseHelper.success(res, null, "Password has been reset successfully");
    } catch (error: Error | any) {
      return ApiResponseHelper.error(
        res,
        error.message || "Failed to reset password",
        error.status || 500
      );
    }
  }
}
