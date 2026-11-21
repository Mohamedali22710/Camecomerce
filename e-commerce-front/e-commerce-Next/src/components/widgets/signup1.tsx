"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Cctv, Eye, EyeOff, Loader2, Lock, Mail, Phone } from "lucide-react";
import { useContext, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { User } from "@/contexts/UserContext";

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

const getSignupSchema = (isAr: boolean) =>
  z
    .object({
      email: z
        .string()
        .min(1, isAr ? "البريد الإلكتروني مطلوب" : "Email is required")
        .email(isAr ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email address")
        .max(255, isAr ? "البريد الإلكتروني طويل جداً" : "Email is too long"),
      phone: z
        .string()
        .trim()
        .min(1, isAr ? "رقم الهاتف مطلوب" : "Phone number is required")
        .refine(
          (val) => PHONE_REGEX.test(val.replace(/[\s()-]/g, "")),
          {
            message: isAr
              ? "رقم الهاتف غير صحيح، يرجى كتابته بالصيغة الدولية (مثال: +9665xxxxxxxx أو +201xxxxxxxx)"
              : "Phone number must be in international format (e.g. +9665xxxxxxxx)",
          }
        ),
      password: z
        .string()
        .min(1, isAr ? "كلمة المرور مطلوبة" : "Password is required")
        .min(8, isAr ? "كلمة المرور يجب ألا تقل عن 8 أحرف" : "Password must be at least 8 characters")
        .max(128, isAr ? "كلمة المرور يجب ألا تتجاوز 128 حرفاً" : "Password must not exceed 128 characters")
        .regex(/[A-Z]/, isAr ? "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل" : "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, isAr ? "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل" : "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, isAr ? "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل" : "Password must contain at least one number"),
      confirmPassword: z
        .string()
        .min(1, isAr ? "يرجى تأكيد كلمة المرور" : "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
      path: ["confirmPassword"],
    });

type SignupFormData = {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

interface Signup1Props {
  className?: string;
}

const Signup1 = ({ className }: Signup1Props) => {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const router = useRouter();
  const { setUserToken, setUserData, setUserRole } = useContext(User)!;

  const schema = useMemo(() => getSignupSchema(isAr), [isAr]);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", phone: "", password: "", confirmPassword: "" },
  });

  const handleResend = async () => {
    setResending(true);
    setResendMsg(null);
    try {
      await axios.post("http://localhost:3007/v1/auth/resend-verify-email", {
        email: form.getValues("email"),
      });
      setResendMsg(isAr ? "تم إعادة إرسال بريد التفعيل بنجاح!" : "Verification email resent!");
    } catch {
      setResendMsg(isAr ? "فشل إعادة الإرسال، يرجى المحاولة لاحقاً." : "Failed to resend. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  const onGoogleSignup = () => {
    window.location.href = "http://localhost:3007/v1/auth/google/signup";
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    const cleanPhone = data.phone.trim().replace(/[\s()-]/g, "");

    try {
      const res = await axios.post("http://localhost:3007/v1/auth/signup", {
        email: data.email.trim(),
        password: data.password,
        confirmPassword: data.confirmPassword,
        phone: cleanPhone,
      });

      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 3500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data;
        const status = err.response?.status;

        // 1) Backend validation errors: { message: "validation error", error: [ { path, message } ] }
        if (Array.isArray(resData?.error) && resData.error.length > 0) {
          for (const item of resData.error) {
            const field = item.path as keyof SignupFormData;
            if (["email", "phone", "password", "confirmPassword"].includes(field)) {
              let msg = item.message;
              if (field === "phone") {
                msg = isAr
                  ? "رقم الهاتف غير صحيح، يرجى كتابته بالصيغة الدولية (مثال: +9665xxxxxxxx أو +201xxxxxxxx)"
                  : item.message;
              } else if (field === "email") {
                msg = isAr ? "البريد الإلكتروني غير صحيح" : item.message;
              } else if (field === "password") {
                msg = isAr ? "كلمة المرور يجب ألا تقل عن 8 أحرف" : item.message;
              }
              form.setError(field, { type: "server", message: msg });
            }
          }
          setServerError(
            isAr
              ? "يرجى تصحيح الأخطاء الموضحة أدناه في النموذج."
              : "Please fix the errors indicated below."
          );
          return;
        }

        // 2) 409 Conflict: Duplicate email or phone
        const rawMsg = String(resData?.message || "");
        if (
          status === 409 ||
          rawMsg.toLowerCase().includes("already exists") ||
          rawMsg.toLowerCase().includes("already in use")
        ) {
          if (rawMsg.toLowerCase().includes("phone")) {
            const phoneMsg = isAr
              ? "رقم الهاتف مستخدم بالفعل بحساب آخر، يرجى استخدام رقم آخر أو تسجيل الدخول."
              : "Phone number is already registered to another account.";
            form.setError("phone", { type: "server", message: phoneMsg });
            setServerError(phoneMsg);
            return;
          }
          if (rawMsg.toLowerCase().includes("email")) {
            const emailMsg = isAr
              ? "البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول أو استخدام بريد آخر."
              : "Email already exists. Please log in or use another email.";
            form.setError("email", { type: "server", message: emailMsg });
            setServerError(emailMsg);
            return;
          }
        }

        // 3) General fallback for backend message
        if (rawMsg && rawMsg !== "validation error") {
          setServerError(rawMsg);
          return;
        }
      }

      setServerError(
        isAr
          ? "حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى."
          : "An error occurred during signup. Please try again."
      );
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
                الحارث الذكي
              </span>
              <span className="text-xs text-muted-foreground leading-none">
                {isAr ? "لكاميرات المراقبة والأنظمة الأمنية" : "Smart CCTV & Security Solutions"}
              </span>
            </div>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] border border-blue-100 dark:border-blue-900/50">
                <Mail className="size-7" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">{t("checkEmail")}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t.rich("verificationSent", {
                  email: () => <strong className="text-foreground">{form.getValues("email")}</strong>,
                })}
              </p>
              {resendMsg && (
                <p className={`mt-3 text-xs font-medium ${resendMsg.includes("فشل") || resendMsg.includes("Failed") ? "text-rose-600" : "text-emerald-600"}`}>
                  {resendMsg}
                </p>
              )}
              <Button
                variant="link"
                size="sm"
                className="mt-3 text-xs text-[#2563EB] hover:underline"
                disabled={resending}
                onClick={handleResend}
              >
                {resending ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إعادة إرسال بريد التفعيل" : "Resend verification email")}
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">{t("redirecting")}</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {t("signupTitle")}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? "أنشئ حسابك للوصول إلى كافة المنتجات والخدمات الأمنية" : "Create an account to access our CCTV store & services"}
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup className="gap-3.5">
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold text-foreground" htmlFor="signup-email">
                          {t("email")}
                        </FieldLabel>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            id="signup-email"
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
                    name="phone"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold text-foreground" htmlFor="signup-phone">
                          {t("phone")}
                        </FieldLabel>
                        <div className="relative">
                          <Phone className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            id="signup-phone"
                            type="tel"
                            placeholder={t("phonePlaceholder")}
                            dir="ltr"
                            className="ps-9 h-11 rounded-xl text-start"
                            aria-invalid={fieldState.invalid}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {t("phoneHint")}
                        </p>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="password"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold text-foreground" htmlFor="signup-password">
                          {t("password")}
                        </FieldLabel>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("passwordPlaceholder")}
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

                  <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold text-foreground" htmlFor="signup-confirm">
                          {t("confirmPassword")}
                        </FieldLabel>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            id="signup-confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("confirmPasswordPlaceholder")}
                            className="ps-9 pe-9 h-11 rounded-xl"
                            aria-invalid={fieldState.invalid}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                    className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors mt-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin me-2" /> : null}
                    {isSubmitting ? t("creatingAccount") : t("signupTitle")}
                  </Button>
                </FieldGroup>
              </form>

              {/* Divider */}
              <div className="relative my-5">
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
                onClick={onGoogleSignup}
              >
                <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>{t("google")}</span>
              </Button>
            </>
          )}
        </div>

        {/* Footer switch */}
        <motion.p
          className="mt-6 text-center text-xs sm:text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
            {t("loginLink")}
          </Link>
        </motion.p>
      </motion.div>
    </motion.section>
  );
};

export { Signup1 };
