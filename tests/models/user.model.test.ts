import { UserModel } from "../../src/models/user.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("UserModel", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("User creation", () => {
    test("should create a user with valid data", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "hashedPassword123",
        gender: "male" as const,
        age: 25,
        role: "user" as const,
        status: "active" as const,
      };

      const user = await UserModel.create(userData);

      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.gender).toBe(userData.gender);
      expect(user.age).toBe(userData.age);
      expect(user.role).toBe(userData.role);
      expect(user.status).toBe(userData.status);
    });

    test("should require email field", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        password: "hashedPassword123",
        gender: "male" as const,
        age: 25,
      };

      await expect(UserModel.create(userData as any)).rejects.toThrow();
    });
  });

  describe("User validation", () => {
    test("should enforce unique email", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "unique@example.com",
        username: "johndoe1",
        password: "hashedPassword123",
        gender: "male" as const,
        age: 25,
      };

      await UserModel.create(userData);

      const duplicateUser = {
        firstName: "Jane",
        lastName: "Smith",
        email: "unique@example.com",
        username: "janesmith",
        password: "hashedPassword456",
        gender: "female" as const,
        age: 30,
      };

      await expect(UserModel.create(duplicateUser)).rejects.toThrow();
    });
  });
});
