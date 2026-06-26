import { z } from "zod";

export const UserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  gender: z.enum(["male", "female", "other"], {
    message: "Gender is required",
  }),
  age: z
    .number()
    .int()
    .min(1, "Age must be at least 1")
    .max(100, "Age must be between 1 and 100"),
  profileImage: z.string().optional(),
  role: z.enum(["admin", "user"]).default("user"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type UserType = z.infer<typeof UserSchema>;
