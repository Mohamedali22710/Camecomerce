"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Cctv, ShieldCheck, Sparkles, SunMedium, Wifi } from "lucide-react";
import { Button } from "@/components/base/button";
import type { Locale } from "@/lib/locale";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export function HeroSection() {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;
  const isAr = locale === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#101D35] text-white shadow-xl [contain:paint]">
      {/* Background Ambience & Grid Patterns strictly clipped */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#101D35] via-[#15233E] to-[#1B2B49]" />
        <div className="absolute -top-32 -end-32 size-96 rounded-full bg-[#2563EB]/20 blur-3xl" />
        <div className="absolute -bottom-32 -start-32 size-96 rounded-full bg-[#2563EB]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 px-6 py-12 md:py-20 lg:py-24 max-w-6xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Text Content */}
          <motion.div
            className="lg:col-span-7 flex flex-col items-start"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            {/* Tag badge */}
            <motion.div variants={fadeInUp} className="mb-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-300 backdrop-blur-xs">
                <Sparkles className="size-3.5 text-[#F59E0B]" />
                <span>{t("heroBadge")}</span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-4"
            >
              {t("heroTitle")}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="text-base sm:text-lg text-slate-300 max-w-xl mb-8 leading-relaxed font-normal"
            >
              {t("heroSubtitle")}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center gap-4 w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-medium shadow-md shadow-blue-900/30 gap-2 transition-all"
                render={<Link href="/products" />}
                nativeButton={false}
              >
                <span>{t("heroCta")}</span>
                <ArrowIcon className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-6 rounded-xl border-slate-700 bg-white/5 hover:bg-white/10 text-white font-medium backdrop-blur-xs gap-2 transition-all"
                render={<Link href="/categories" />}
                nativeButton={false}
              >
                <span>{t("heroCtaSecondary")}</span>
              </Button>
            </motion.div>

            {/* Trust feature points */}
            <motion.div
              variants={fadeInUp}
              className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 w-full text-slate-300"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#2563EB] shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t("warranty2Years")}</span>
              </div>
              <div className="flex items-center gap-2">
                <SunMedium className="size-4 text-[#F59E0B] shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t("solarAnd4G")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="size-4 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t("cloudLive")}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Graphic / CCTV Feature Card */}
          <motion.div
            className="lg:col-span-5 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative mx-auto max-w-sm rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-6 backdrop-blur-md shadow-2xl">
              {/* Surveillance Graphic representation */}
              <div className="relative flex aspect-square items-center justify-center rounded-xl bg-gradient-to-tr from-[#0F172A] to-[#1E293B] border border-slate-700/40 p-8 overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#101D35] shadow-lg shadow-blue-500/20 text-white mb-4">
                    <Cctv className="size-12 text-white animate-pulse" />
                    <span className="absolute -top-1 -end-1 flex size-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white tracking-tight">
                    {t("smartSecurityBadge")}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {t("smartSecurityDesc")}
                  </p>
                </div>
              </div>

              {/* Status pill row */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-300 px-2 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span>{t("liveSurveillanceActive")}</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">4K UHD 60FPS</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
