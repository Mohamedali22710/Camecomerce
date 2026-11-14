/** User model: authentication, roles, profile, and soft-delete state. */
import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "admin" | "user" | "superAdmin";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string | null;
  isActive: boolean;
  imageURL?: string | null;
  role: UserRole;
  phone?: string | null;
  googleId?: string | null;
  isBlocked: boolean;
}

const userSchema = new Schema<IUser>(
  {
    // Names are derived from the email prefix, so they must not be unique.
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: null },
    // For email/password users this also means "email verified".
    isActive: { type: Boolean, default: false },
    imageURL: { type: String, default: null },
    role: {
      type: String,
      enum: ["admin", "user", "superAdmin"],
      default: "user",
    },
    phone: { type: String, default: null },
    googleId: { type: String, default: null },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const userModel = mongoose.model<IUser>("User", userSchema);
