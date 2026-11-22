"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/base/button";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="text-2xl font-semibold">
        {t("pageNotFoundTitle")}
      </h2>
      <p className="text-muted-foreground max-w-md">
        {t("pageNotFoundDesc")}
      </p>
      <Button render={<Link href="/" />} nativeButton={false}>
        {t("goHome")}
      </Button>
    </div>
  );
}
