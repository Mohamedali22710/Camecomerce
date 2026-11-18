"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { curtains, iris } from "motion-plus-dom/curtains";

import { Button } from "@/components/base/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/base/dropdown-menu";

function useIrisTheme() {
  const { setTheme } = useTheme();

  const switchTheme = React.useCallback(
    async (theme: string) => {
      try {
        await curtains(
          () => {
            setTheme(theme);
            return new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            );
          },
          { effect: iris() },
        );
      } catch {
        setTheme(theme);
      }
    },
    [setTheme],
  );

  return switchTheme;
}

export function ModeToggle() {
  const switchTheme = useIrisTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = useTranslations("theme");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" aria-label="Toggle theme" className="size-9">
        <Sun className="size-4 opacity-50" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="size-9 relative" />}>
        <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">{t("toggleTheme")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchTheme("light")}>
          {t("light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchTheme("dark")}>
          {t("dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchTheme("system")}>
          {t("system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
