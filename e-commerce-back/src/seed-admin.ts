/** Seed script to create or reset a default Super Admin account */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { userModel } from "./database/model/user.model.js";
import { env } from "../config/env.service.js";

async function seedAdmin() {
  const uri = env.MONGODB_URI || "mongodb://localhost:27017/e-commerce";
  await mongoose.connect(uri);

  const email = "admin@admin.com";
  const password = "adminPassword123";
  const hashedPassword = await bcrypt.hash(password, Number(env.hash) || 10);

  const existing = await userModel.findOne({ email });
  if (existing) {
    existing.role = "superAdmin";
    existing.isActive = true;
    existing.password = hashedPassword;
    await existing.save();
    console.log(`✅ Updated existing user ${email} to superAdmin.`);
  } else {
    await userModel.create({
      name: "Super Admin",
      email,
      password: hashedPassword,
      role: "superAdmin",
      isActive: true,
    });
    console.log(`✅ Created new superAdmin account: ${email}`);
  }

  console.log("\n=========================================");
  console.log("  Admin Login Credentials:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("=========================================\n");

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error("Error creating admin:", err);
  process.exit(1);
});

