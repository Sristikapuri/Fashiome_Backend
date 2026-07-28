import { randomUUID } from "node:crypto";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../src/configs/constant";
import { UserModel, IUser } from "../../src/models/user.model";

export function uniqueSuffix(): string {
  return randomUUID().replace(/-/g, "").slice(0, 10);
}

export function uniqueEmail(prefix = "jest"): string {
  return `${prefix}.${uniqueSuffix()}@fashiome-jest.test`;
}

type CreateUserOverrides = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  gender: "male" | "female" | "other";
  age: number;
  role: "admin" | "user";
  status: "active" | "inactive";
}>;

/** Creates a user directly in the test database with an already-hashed password. */
export async function createUser(overrides: CreateUserOverrides = {}): Promise<{
  user: IUser;
  plainPassword: string;
}> {
  const plainPassword = overrides.password || "Passw0rd!";
  const user = await UserModel.create({
    firstName: "Test",
    lastName: "User",
    email: uniqueEmail(),
    username: `jestuser${uniqueSuffix()}`,
    gender: "female",
    age: 25,
    role: "user",
    status: "active",
    ...overrides,
    password: await bcryptjs.hash(plainPassword, 10),
  });

  return { user, plainPassword };
}

export function issueToken(userId: string): string {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: "1h" });
}

export async function createAdminAndToken(overrides: CreateUserOverrides = {}) {
  const { user } = await createUser({ ...overrides, role: "admin" });
  return { user, token: issueToken(user._id.toString()) };
}

export async function createRegularUserAndToken(overrides: CreateUserOverrides = {}) {
  const { user } = await createUser({ ...overrides, role: "user" });
  return { user, token: issueToken(user._id.toString()) };
}
