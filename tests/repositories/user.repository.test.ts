import { UserMongoRepository } from "../../src/repositories/user.repository";
import { UserModel } from "../../src/models/user.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "../setup/db";

describe("UserMongoRepository", () => {
  let repository: UserMongoRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new UserMongoRepository();
  }, 60_000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe("createUser", () => {
    test("should create a new user", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "hashedPassword",
        gender: "male" as const,
        age: 25,
      };

      const user = await repository.createUser(userData);

      expect(user.firstName).toBe(userData.firstName);
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
    });
  });

  describe("getUserByEmail", () => {
    test("should find user by email", async () => {
      const userData = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        username: "janesmith",
        password: "hashedPassword",
        gender: "female" as const,
        age: 30,
      };

      await UserModel.create(userData);

      const user = await repository.getUserByEmail("jane@example.com");
      expect(user).not.toBeNull();
      expect(user?.email).toBe("jane@example.com");
    });
  });
});
