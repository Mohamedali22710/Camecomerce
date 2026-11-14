/** Passport.js Google OAuth strategy configuration for signup and login. */
import passport from "passport";
import {
  Profile,
  Strategy as GoogleStrategy,
  VerifyCallback,
} from "passport-google-oauth20";

import { env } from "../../../config/env.service.js";
import { userModel } from "../../database/model/user.model.js";

const getHighQualityPhoto = (url: string | null | undefined): string | null => {
  if (!url) {return null;}
  return url
    .replace(/=s\d+-c/, "=s1024-c")
    .replace(/\/s\d+-c\//, "/s1024-c/")
    .replace(/=s\d+$/, "=s1024-c");
};

export const isGoogleConfigured = (): boolean =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

let initialized = false;

/** Registers both Google strategies once at application startup. */
export const initPassport = (): void => {
  if (initialized) {return;}
  initialized = true;

  if (!isGoogleConfigured()) {
    console.warn(
      "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET); Google routes will return 503.",
    );
    return;
  }

  passport.use(
    "google-signup",
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${env.base_url}/v1/auth/google/signup/callback`,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
      ) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) {
            return done(null, false, {
              message: "No email found from Google account",
            });
          }

          const existingUser = await userModel.findOne({ email });
          if (existingUser) {
            return done(null, false, {
              message:
                "An account with this email already exists. Please login instead.",
            });
          }

          const name = email.split("@")[0] || `user_${profile.id}`;

          // Public OAuth signup must never be able to choose a privileged role.
          const user = await userModel.create({
            name,
            email,
            googleId: profile.id,
            imageURL: getHighQualityPhoto(profile.photos?.[0]?.value),
            isActive: true,
            role: "user",
          });

          return done(null, { _id: String(user._id), role: user.role });
        } catch (error: any) {
          console.error("Google signup error:", error?.message);
          return done(error, false);
        }
      },
    ),
  );

  passport.use(
    "google-login",
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${env.base_url}/v1/auth/google/login/callback`,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
      ) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) {
            return done(null, false, {
              message: "No email found from Google account",
            });
          }

          const user = await userModel.findOne({ email });
          if (!user) {
            return done(null, false, {
              message: "No account found with this email. Please signup first.",
            });
          }

          if (user.isBlocked) {
            return done(null, false, { message: "This account is blocked." });
          }

          if (!user.isActive) {
            return done(null, false, {
              message: "Please verify your email first.",
            });
          }

          if (!user.googleId) {
            user.googleId = profile.id;
            const highQualityPhoto = getHighQualityPhoto(
              profile.photos?.[0]?.value,
            );
            if (highQualityPhoto && !user.imageURL) {
              user.imageURL = highQualityPhoto;
            }
            await user.save();
          }

          return done(null, { _id: String(user._id), role: user.role });
        } catch (error: any) {
          console.error("Google login error:", error?.message);
          return done(error as Error, false);
        }
      },
    ),
  );
};
