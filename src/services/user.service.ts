import { UserMongoRepository } from "../repositories/user.repository";
import { UserRegistrationDTOType, UserAuthenticationDTOType } from "../dtos/user.dto";
import { IUser } from "../models/user.model";
import { HttpException } from "../exceptions/http-exception";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../configs/constant";

const userRepository = new UserMongoRepository();

export class UserService {
  async registerUser(userData: UserRegistrationDTOType): Promise<IUser> {
    const existingEmail = await userRepository.getUserByEmail(userData.email);
    if (existingEmail) {
      throw new HttpException(400, "Email address is already registered");
    }

    const existingUsername = await userRepository.getUserByUsername(userData.username);
    if (existingUsername) {
      throw new HttpException(400, "Username is already taken");
    }

    const hashedPassword = await bcryptjs.hash(userData.password, 10);
    userData.password = hashedPassword;

    const user = await userRepository.createUser(userData);
    return user;
  }

  async authenticateUser(loginData: UserAuthenticationDTOType) {
    const user = await userRepository.getUserByEmail(loginData.email);
    if (!user) {
      throw new HttpException(400, "Invalid credentials provided");
    }

    const isPasswordValid = await bcryptjs.compare(
      loginData.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new HttpException(400, "Invalid credentials provided");
    }

    const token = jwt.sign(
      { userId: user._id, userEmail: user.email, userRole: user.role },
      SECRET_KEY,
      { expiresIn: "30d" }
    );

    return { user, token };
  }

  async getAllUsers(): Promise<IUser[]> {
    return await userRepository.getAll();
  }

  async getUserById(id: string): Promise<IUser | null> {
    return await userRepository.getUserById(id);
  }

  async updateUser(id: string, userData: Partial<IUser>): Promise<IUser | null> {
    if (userData.email) {
      const existingEmail = await userRepository.getUserByEmail(userData.email);
      if (existingEmail && existingEmail._id.toString() !== id) {
        throw new HttpException(400, "Email address is already registered");
      }
    }

    if (userData.username) {
      const existingUsername = await userRepository.getUserByUsername(userData.username);
      if (existingUsername && existingUsername._id.toString() !== id) {
        throw new HttpException(400, "Username is already taken");
      }
    }

    if (userData.password) {
      userData.password = await bcryptjs.hash(userData.password, 10);
    }
    return await userRepository.update(id, userData);
  }

  async deleteUser(id: string): Promise<boolean> {
    return await userRepository.delete(id);
  }

  async getPaginatedUsers(page: number, limit: number, search?: string) {
    return await userRepository.getPaginatedUsers(page, limit, search);
  }

  async checkPassword(id: string, currentPassword: string): Promise<boolean> {
    const user = await userRepository.getUserById(id);
    if (!user) {
      throw new HttpException(404, "User not found");
    }

    const isPasswordValid = await bcryptjs.compare(currentPassword, user.password);
    return isPasswordValid;
  }
}
