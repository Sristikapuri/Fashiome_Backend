import { Response } from "express";

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
    data: any = null
  ): Response {
    const response: ApiResponse<any> = {
      statusCode,
      isSuccess: false,
      responseMessage: message,
      responseData: data,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }
}
