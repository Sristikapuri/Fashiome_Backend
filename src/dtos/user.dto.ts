import { z } from "zod";
import { UserSchema } from "../types/user.type";

// Registration DTO for new user creation (excludes role)
export const UserRegistrationDTO = UserSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  password: true,
  gender: true,
  age: true,
});

export type UserRegistrationDTOType = z.infer<typeof UserRegistrationDTO>;

// Authentication DTO for user login (only email and password)
export const UserAuthenticationDTO = UserSchema.pick({
  email: true,
  password: true,
});

export type UserAuthenticationDTOType = z.infer<typeof UserAuthenticationDTO>;
