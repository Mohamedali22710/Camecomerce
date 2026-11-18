"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Cctv } from "lucide-react";
import { Card } from "@/components/base/card";
import { getLocalizedField, type Locale } from "@/lib/locale";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export interface HomeCategory {
  _id: string;
  en_name: string;
  ar_name?: string;
  fr_name?: string;
  imageURL: string | null;
}

interface CategoryGridSectionProps {
  categories: HomeCategory[];
  locale: Locale;
}

export function CategoryGridSection({ categories, locale }: CategoryGridSectionProps) {
  const t = useTranslations("home");
  const isAr = locale === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-50px" }}
      variants={stagger}
      className="space-y-6"
    >
      <div className="flex items-end justify-between">
        <div>
          <motion.div variants={fadeInUp} className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] mb-1">
            {t("categoriesBadge")}
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("categoriesTitle")}
          </motion.h2>
        </div>

        <Link
          href="/categories"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-blue-700 transition-colors"
        >
          <span>{isAr ? "عرض الكل" : "View All"}</span>
          <ArrowIcon className="size-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((cat) => {
          const catName = getLocalizedField(cat, "name", locale) || cat.en_name;
          return (
            <motion.div key={cat._id} variants={fadeInUp}>
              <Link href={`/categories/${cat._id}`} className="group block h-full">
                <Card className="relative h-64 overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700">
                  {cat.imageURL ? (
                    <div className="relative size-full">
                      <Image
                        src={cat.imageURL}
                        alt={catName}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      {/* Gradient Shield */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101D35]/90 via-[#101D35]/40 to-transparent transition-opacity group-hover:from-[#101D35]/95" />
                    </div>
                  ) : (
                    <div className="relative size-full bg-gradient-to-br from-[#101D35] to-[#1B2B49] flex items-center justify-center p-6 text-white/20">
                      <Cctv className="size-20" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101D35] to-transparent" />
                    </div>
                  )}

                  {/* Bottom Anchored Content */}
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white flex items-end justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-300 block mb-1">
                        {isAr ? "تصفح الفئة" : "Explore Category"}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-blue-300 transition-colors">
                        {catName}
                      </h3>
                    </div>

                    <div className="flex size-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-xs text-white opacity-80 group-hover:opacity-100 group-hover:bg-[#2563EB] transition-all">
                      <ArrowIcon className="size-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
