/**
 * Local/staging E2E fixture seed (MVP-23).
 *
 * Creates a verified customer, an admin, and one active product so the Cypress
 * checkout spec can run without manual dashboard work. It refuses to run in
 * production and is intended only for a disposable test database.
 *
 * Run against the same MONGODB_URI the API uses:
 *   npm run seed:e2e
 *
 * Credentials come from E2E_USER_* / E2E_ADMIN_* or the documented local test
 * defaults below. Passwords are never printed. Override them for any shared
 * environment.
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { env } from "../config/env.service.js";

import { categoryModel } from "./database/model/category.model.js";
import { productModel } from "./database/model/product.model.js";
import { subcategoryModel } from "./database/model/subcategory.model.js";
import { userModel } from "./database/model/user.model.js";

const PRODUCT_NAME = "E2E CCTV Camera";
const PRODUCT_STOCK = 25;
const PRODUCT_PRICE = 100;

const readFixture = (prefix: "E2E_USER" | "E2E_ADMIN") => {
  const email = (process.env[`${prefix}_EMAIL`] || `${prefix.toLowerCase().replace("_", ".")}@example.test`).toLowerCase();
  const password = process.env[`${prefix}_PASSWORD`] || (prefix === "E2E_USER" ? "E2eUser123!" : "E2eAdmin123!");
  return { email, password };
};

const ensureUser = async (email: string, password: string, role: "user" | "admin") => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await userModel.findOne({ email });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = role;
    existing.isActive = true;
    existing.isBlocked = false;
    await existing.save();
    return existing;
  }

  return userModel.create({
    name: email.split("@")[0] || role,
    email,
    password: hashedPassword,
    role,
    isActive: true,
    isBlocked: false,
  });
};

const ensureCatalog = async () => {
  const category = await categoryModel.findOneAndUpdate(
    { en_name: "E2E CCTV" },
    { $set: { isActive: true }, $setOnInsert: { addedByEmail: "e2e@example.test" } },
    { upsert: true, returnDocument: "after" },
  );

  const subcategory = await subcategoryModel.findOneAndUpdate(
    { en_name: "E2E Cameras", categoryId: category._id },
    { $set: { isActive: true }, $setOnInsert: { addedByEmail: "e2e@example.test" } },
    { upsert: true, returnDocument: "after" },
  );

  const product = await productModel.findOneAndUpdate(
    { en_name: PRODUCT_NAME },
    {
      $set: {
        en_description: "Fixture product for the checkout end-to-end test.",
        price: PRODUCT_PRICE,
        discount: 0,
        variants: JSON.stringify([{ color: "White", size: "Default", stock: PRODUCT_STOCK }]),
        subcategoryId: subcategory._id,
        addedByEmail: "e2e@example.test",
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  return { categoryId: String(category._id), subcategoryId: String(subcategory._id), productId: String(product._id) };
};

async function seedE2E() {
  if (env.isProduction) {
    throw new Error("Refusing to seed E2E fixtures in production.");
  }
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to seed E2E fixtures. See config/.env.example.");
  }

  const userFixture = readFixture("E2E_USER");
  const adminFixture = readFixture("E2E_ADMIN");

  await mongoose.connect(env.MONGODB_URI);
  try {
    await ensureUser(userFixture.email, userFixture.password, "user");
    await ensureUser(adminFixture.email, adminFixture.password, "admin");
    const catalog = await ensureCatalog();

    console.log("E2E fixtures ready");
    console.log(`user=${userFixture.email}`);
    console.log(`admin=${adminFixture.email}`);
    console.log(`product=${PRODUCT_NAME}`);
    console.log(JSON.stringify(catalog));
    console.log("Passwords are not printed; set E2E_USER_PASSWORD / E2E_ADMIN_PASSWORD to override.");
  } finally {
    await mongoose.disconnect();
  }
}

seedE2E().catch((error: unknown) => {
  console.error("Error seeding E2E fixtures:", error instanceof Error ? error.message : error);
  process.exit(1);
});
