/** Seed script to create or promote a Super Admin account.
 *
 * Credentials are never hardcoded and the password is never printed. Provide
 * `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the environment (or
 * `config/.env`). Existing accounts keep their current password unless
 * `SEED_ADMIN_RESET_PASSWORD=true` is explicitly set.
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { env } from "../config/env.service.js";

import { readSeedCredentials } from "./common/utils/seedCredentials.js";
import { userModel } from "./database/model/user.model.js";

async function seedAdmin() {
  const { email, password, resetPassword } = readSeedCredentials();
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to seed an admin account. See config/.env.example.");
  }
  await mongoose.connect(env.MONGODB_URI);

  try {
    const existing = await userModel.findOne({ email });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, Number(env.hash) || 10);
      await userModel.create({
        name: "Super Admin",
        email,
        password: hashedPassword,
        role: "superAdmin",
        isActive: true,
      });
      console.log(`Created superAdmin account: ${email}`);
      console.log("Store the password in a password manager; it is not printed here.");
      return;
    }

    existing.role = "superAdmin";
    existing.isActive = true;

    if (resetPassword) {
      existing.password = await bcrypt.hash(password, Number(env.hash) || 10);
      await existing.save();
      console.log(`Promoted ${email} to superAdmin and reset its password.`);
      return;
    }

    await existing.save();
    console.log(
      `Promoted ${email} to superAdmin. Password was left unchanged ` +
        "(set SEED_ADMIN_RESET_PASSWORD=true to reset it).",
    );
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error("Error seeding admin:", error instanceof Error ? error.message : error);
  process.exit(1);
});
