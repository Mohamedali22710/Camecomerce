"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { ProductCardCctv, type CCTVProduct } from "@/components/widgets/product-card-cctv";
import { ProductGridSkeleton } from "@/components/widgets/skeletons";
import type { Locale } from "@/lib/locale";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export function FeaturedProductsSection() {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;
  const isAr = locale === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [products, setProducts] = useState<CCTVProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/products?limit=8");
        const data = res.data?.data;
        const list = data?.products || data || [];
        setProducts(Array.isArray(list) ? list : []);
      } catch {
        // silent fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <ProductGridSkeleton count={4} />
      </section>
    );
  }

  if (products.length === 0) {
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
          <motion.div variants={fadeInUp} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2563EB] mb-1">
            <Sparkles className="size-3.5 text-[#F59E0B]" />
            <span>{t("featuredBadge")}</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("featuredTitle")}
          </motion.h2>
        </div>

        <Link
          href="/products"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-blue-700 transition-colors"
        >
          <span>{t("viewAllProducts")}</span>
          <ArrowIcon className="size-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.slice(0, 8).map((product, index) => (
          <motion.div key={product._id} variants={fadeInUp}>
            <ProductCardCctv product={product} priority={index < 4} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
