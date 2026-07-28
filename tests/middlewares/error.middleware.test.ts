import { Request, Response, NextFunction } from "express";
import { errorMiddleware } from "../../src/middlewares/error.middleware";
import { HttpException } from "../../src/exceptions/http-exception";

describe("Error Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("errorMiddleware", () => {
    test("should handle HttpException with status code", () => {
      const error = new HttpException(404, "Resource not found");

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    test("should handle generic errors with 500 status", () => {
      const error = new Error("Internal server error");

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

  });
});
