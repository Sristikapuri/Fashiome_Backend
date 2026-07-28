import { Request, Response, NextFunction } from "express";
import { authorizedMiddleware, adminMiddleware } from "../../src/middlewares/authorized.middleware";
import { SECRET_KEY } from "../../src/configs/constant";
import jwt from "jsonwebtoken";
import { UserMongoRepository } from "../../src/repositories/user.repository";

describe("Authorized Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("authorizedMiddleware", () => {
    test("should pass with valid token and existing user", async () => {
      const validToken = jwt.sign({ userId: "user123" }, SECRET_KEY, { expiresIn: "1h" });
      mockRequest.headers = { authorization: `Bearer ${validToken}` };
      jest
        .spyOn(UserMongoRepository.prototype, "getUserById")
        .mockResolvedValue({ _id: "user123", role: "user" } as any);

      await authorizedMiddleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
    });

    test("should fail without authorization header", async () => {
      await authorizedMiddleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

  });

  describe("adminMiddleware", () => {
    test("should pass when user is admin", async () => {
      mockRequest.user = { role: "admin" } as any;

      await adminMiddleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test("should fail when user is not admin", async () => {
      mockRequest.user = { role: "user" } as any;

      await adminMiddleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
