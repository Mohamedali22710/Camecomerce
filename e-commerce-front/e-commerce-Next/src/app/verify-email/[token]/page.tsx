"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

import { Button } from "@/components/base/button";
import { Skeleton } from "@/components/base/skeleton";

export default function VerifyEmailPage() {
  const t = useTranslations("verifyEmail");
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        setMessage(res.data?.message || t("success"));
        setStatus("success");
      } catch (err: unknown) {
        setStatus("error");
      }
    })();
  }, [token, t]);

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-md border border-muted bg-background px-6 py-8 shadow-md">
          {status === "loading" && (
            <div className="space-y-4">
              <Skeleton className="mx-auto size-12 rounded-full" />
              <Skeleton className="mx-auto h-6 w-48" />
              <p className="text-sm text-muted-foreground">{t("verifying")}</p>
            </div>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-500" />
              <h1 className="mb-2 text-xl font-semibold">{t("success")}</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                {t("successDesc")}
              </p>
              <Button render={<Link href="/login" />} nativeButton={false}>
                {t("goToLogin")}
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto mb-4 size-12 text-destructive" />
              <h1 className="mb-2 text-xl font-semibold">{t("failed")}</h1>
              <p className="mb-6 text-sm text-muted-foreground">{message || t("failed")}</p>
              <Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
                {t("backToLogin")}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
