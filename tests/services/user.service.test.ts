import { UserService } from "../../src/services/user.service";
import { UserMongoRepository } from "../../src/repositories/user.repository";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    userService = new UserService();
  });

  describe("registerUser", () => {
    test("should register a new user successfully", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "password123",
        gender: "male" as const,
        age: 25,
      };

      const getUserByEmailSpy = jest
        .spyOn(UserMongoRepository.prototype, "getUserByEmail")
        .mockResolvedValue(null);
      const getUserByUsernameSpy = jest
        .spyOn(UserMongoRepository.prototype, "getUserByUsername")
        .mockResolvedValue(null);
      (bcryptjs.hash as jest.Mock).mockResolvedValue("hashedPassword");
      jest.spyOn(UserMongoRepository.prototype, "createUser").mockResolvedValue({
        _id: "123",
        ...userData,
        password: "hashedPassword",
        role: "user",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await userService.registerUser(userData);
      expect(result).toBeDefined();
      expect(getUserByEmailSpy).toHaveBeenCalledWith(userData.email);
      expect(getUserByUsernameSpy).toHaveBeenCalledWith(userData.username);
      expect(bcryptjs.hash).toHaveBeenCalledWith("password123", 10);
    });
  });

  describe("authenticateUser", () => {
    test("should authenticate user with valid credentials", async () => {
      const loginData = { email: "john@example.com", password: "password123" };
      const mockUser = {
        _id: "123",
        email: "john@example.com",
        password: "hashedPassword",
        role: "user",
      };

      jest.spyOn(UserMongoRepository.prototype, "getUserByEmail").mockResolvedValue(mockUser as any);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("mockToken");

      const result = await userService.authenticateUser(loginData);
      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mockToken");
    });
  });

  describe("checkPassword", () => {
    test("should return true for correct password", async () => {
      const mockUser = {
        _id: "123",
        password: "hashedPassword",
      };

      jest.spyOn(UserMongoRepository.prototype, "getUserById").mockResolvedValue(mockUser as any);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);

      const result = await userService.checkPassword("123", "currentPassword");
      expect(result).toBe(true);
    });
  });
});
