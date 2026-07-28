import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../src/middlewares/validation.middleware";
import { z } from "zod";

describe("Validation Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("validateRequest", () => {
    test("should pass validation with valid data", () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      });

      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };

      validateRequest(schema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test("should fail validation with invalid email", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      mockRequest.body = {
        email: "invalid-email",
      };

      validateRequest(schema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

  });
});
