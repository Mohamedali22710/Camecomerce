"use client";

import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-2xl font-bold">{t("somethingWentWrong")}</h1>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
