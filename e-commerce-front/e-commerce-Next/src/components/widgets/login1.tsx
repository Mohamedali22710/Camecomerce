"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { Cctv, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "motion/react";
import { z } from "zod";

import { Button } from "@/components/base/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/base/field";
import { Input } from "@/components/base/input";
import api, { setAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { User } from "@/contexts/UserContext";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must not exceed 20 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface Login1Props {
  className?: string;
}

const Login1 = ({ className }: Login1Props) => {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const { setUserToken, setUserData, setUserRole } = useContext(User)!;

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onGoogleLogin = () => {
    window.location.href = "http://localhost:3007/v1/auth/google/login";
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await axios.post("http://localhost:3007/v1/auth/login", data);
      const { accessToken, refreshToken } = res.data.data;

      Cookies.set("refreshToken", refreshToken, { expires: 365, sameSite: "lax" });
      localStorage.setItem("refreshToken", refreshToken);

      const decoded: { role?: string } = jwtDecode(accessToken);
      const role = decoded.role || "user";

      setUserToken(accessToken);
      setUserRole(role);
      setAuth(role, accessToken);

      const profileRes = await api.get("/user/profile");
      setUserData(profileRes.data.data);

      router.push("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError(t("networkError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      className={cn(
        "flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#F7F8FA] dark:bg-[#0B1120] px-4 py-12 relative overflow-hidden",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Ambient background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none [contain:paint]">
        <div className="absolute top-1/4 -start-24 size-80 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 -end-24 size-80 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 220 }}
      >
        {/* Brand identity header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#101D35] to-[#2563EB] text-white shadow-md shadow-blue-900/10 transition-transform group-hover:scale-105">
              <Cctv className="size-6 text-white" />
            </div>
            <div className="flex flex-col text-start">
              <span className="font-bold text-lg text-foreground tracking-tight leading-tight">
                {tCommon("brandName")}
              </span>
              <span className="text-xs text-muted-foreground leading-none">
                {tCommon("brandSlogan")}
              </span>
            </div>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {t("loginTitle")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t("loginSubtitle")}
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold text-foreground" htmlFor="login-email">
                      {t("email")}
                    </FieldLabel>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        className="ps-9 h-11 rounded-xl"
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-xs font-semibold text-foreground" htmlFor="login-password">
                        {t("password")}
                      </FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-[#2563EB] hover:underline font-medium"
                      >
                        {t("forgotPassword")}
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="ps-9 pe-9 h-11 rounded-xl"
                        aria-invalid={fieldState.invalid}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {serverError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300 font-medium text-center">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin me-2" /> : null}
                {isSubmitting ? t("loggingIn") : t("login")}
              </Button>
            </FieldGroup>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">{t("or")}</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-xl gap-2.5 font-medium border-border hover:bg-muted text-foreground transition-colors"
            onClick={onGoogleLogin}
          >
            <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>{t("google")}</span>
          </Button>
        </div>

        {/* Footer switch */}
        <motion.p
          className="mt-6 text-center text-xs sm:text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-[#2563EB] hover:underline">
            {t("signupLink")}
          </Link>
        </motion.p>
      </motion.div>
    </motion.section>
  );
};

export { Login1 };
