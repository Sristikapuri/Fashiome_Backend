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
    // Email duplicate checking
    const existingEmail = await userRepository.getUserByEmail(userData.email);
    if (existingEmail) {
      throw new HttpException(400, "Email address is already registered");
    }

    // Username duplicate checking
    const existingUsername = await userRepository.getUserByUsername(userData.username);
    if (existingUsername) {
      throw new HttpException(400, "Username is already taken");
    }

    // Password hashing
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

    // Password verification
    const isPasswordValid = await bcryptjs.compare(
      loginData.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new HttpException(400, "Invalid credentials provided");
    }

    // JWT generation
    const token = jwt.sign(
      { userId: user._id, userEmail: user.email, userRole: user.role },
      SECRET_KEY,
      { expiresIn: "30d" }
    );

    return { user, token };
  }
}
