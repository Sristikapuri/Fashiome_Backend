import mongoose from "mongoose";
import { UserModel } from "./src/models/user.model";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fashiome-db";

async function createAdminUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

   
    const existingAdmin = await UserModel.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:");
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Username: ${existingAdmin.username}`);
      console.log(`Password: (use existing password or reset if needed)`);
      process.exit(0);
    }

  
    const hashedPassword = await bcryptjs.hash("admin123", 10);
    const adminUser = await UserModel.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@fashiome.com",
      username: "admin",
      password: hashedPassword,
      gender: "other",
      age: 25,
      role: "admin",
    });

    console.log("Admin user created successfully:");
    console.log(`Email: ${adminUser.email}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Password: admin123`);
    console.log("\nPlease change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createAdminUser();
