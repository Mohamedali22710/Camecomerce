"use client";

import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function LocaleTransition({ children }: { children: ReactNode }) {
  const locale = useLocale();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={locale}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="flex min-h-full flex-col flex-1 w-full max-w-full overflow-x-clip"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
