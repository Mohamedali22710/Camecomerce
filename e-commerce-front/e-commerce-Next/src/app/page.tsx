"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import api from "@/lib/api";
import {
  HeroSection,
  CategoryGridSection,
  FeaturedProductsSection,
  TrustBadgesSection,
  type HomeCategory,
} from "@/components/widgets/home";
import { HeroSkeleton, CategoryGridSkeleton } from "@/components/widgets/skeletons";
import type { Locale } from "@/lib/locale";

export default function Home() {
  const locale = useLocale() as Locale;
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const catRes = await api.get("/category");
        setCategories(catRes.data?.data || catRes.data || []);
      } catch {
        // silent fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-12 py-6">
        <HeroSkeleton />
        <CategoryGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-12 py-6">
      {/* 1. Hero Banner */}
      <HeroSection />

      {/* 2. Trust & Guarantee Badges */}
      <TrustBadgesSection />

      {/* 3. Category Discovery */}
      <CategoryGridSection categories={categories} locale={locale} />

      {/* 4. Featured Security Hardware & Cameras */}
      <FeaturedProductsSection />
    </div>
  );
}
