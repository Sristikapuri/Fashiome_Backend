import { ApiResponseHelper } from "../../src/utils/apihelper.util";
import { Response } from "express";

describe("ApiResponseHelper", () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("success", () => {
    test("should return success response with data", () => {
      const data = { message: "Success" };

      ApiResponseHelper.success(mockResponse as Response, data, "200");

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: true,
          responseData: data,
        })
      );
    });

  });

  describe("error", () => {
    test("should return error response with message", () => {
      ApiResponseHelper.error(mockResponse as Response, "Error message", 400);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: false,
          responseMessage: "Error message",
        })
      );
    });

  });
});
