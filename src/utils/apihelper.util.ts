import { Response } from "express";
import { HttpException } from "../exceptions/http-exception";

/**
 * Narrows an unknown value caught in a `catch` block down to a human-readable
 * message, mirroring the old `error.message || fallback` duck-typed access
 * that was previously done through `any`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Narrows an unknown value caught in a `catch` block down to an HTTP status
 * code. Only `HttpException` (the only error type this codebase throws with
 * a `status` field) contributes a status; anything else falls back to 500,
 * matching the previous `error.status || 500` behavior.
 */
export function getErrorStatus(error: unknown, fallback = 500): number {
  return error instanceof HttpException ? error.status : fallback;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  statusCode: number;
  isSuccess: boolean;
  responseMessage: string;
  responseData: T;
  paginationMeta?: PaginationMeta;
  timestamp: string;
}

export class ApiResponseHelper {
  static success<T>(
    res: Response,
    data: T,
    message: string = "Operation completed successfully",
    statusCode: number = 200,
    paginationMeta?: PaginationMeta
  ): Response {
    const response: ApiResponse<T> = {
      statusCode,
      isSuccess: true,
      responseMessage: message,
      responseData: data,
      paginationMeta,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = "An error occurred",
    statusCode: number = 500,
    data: unknown = null
  ): Response {
    const response: ApiResponse<unknown> = {
      statusCode,
      isSuccess: false,
      responseMessage: message,
      responseData: data,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }
}
