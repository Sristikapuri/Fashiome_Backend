import { z } from "zod";
import { UserSchema } from "../types/user.type";


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

export const UserAuthenticationDTO = UserSchema.pick({
  email: true,
  password: true,
});

export type UserAuthenticationDTOType = z.infer<typeof UserAuthenticationDTO>;

export const UserUpdateDTO = UserSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  password: true,
  gender: true,
  age: true,
  profileImage: true,
  status: true,
}).partial();

export type UserUpdateDTOType = z.infer<typeof UserUpdateDTO>;

export const AdminUserCreateDTO = UserSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  password: true,
  gender: true,
  age: true,
  role: true,
  status: true,
});

export type AdminUserCreateDTOType = z.infer<typeof AdminUserCreateDTO>;


export const AdminUserUpdateDTO = UserSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  password: true,
  gender: true,
  age: true,
  profileImage: true,
  role: true,
  status: true,
}).partial();

export type AdminUserUpdateDTOType = z.infer<typeof AdminUserUpdateDTO>;
