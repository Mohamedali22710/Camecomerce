"use client";

import { useTranslations } from "next-intl";
import { Headphones, ShieldCheck, Truck, Wrench } from "lucide-react";

export function TrustBadgesSection() {
  const t = useTranslations("home");

  const badges = [
    {
      icon: Truck,
      title: t("trustShipping"),
      description: t("trustShippingDesc"),
    },
    {
      icon: ShieldCheck,
      title: t("trustWarranty"),
      description: t("trustWarrantyDesc"),
    },
    {
      icon: Headphones,
      title: t("trustSupport"),
      description: t("trustSupportDesc"),
    },
    {
      icon: Wrench,
      title: t("trustInstall"),
      description: t("trustInstallDesc"),
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-xs">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div key={index} className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] border border-blue-100 dark:border-blue-900/50">
                <Icon className="size-5" />
              </div>
              <div className="flex flex-col text-start">
                <h4 className="text-sm md:text-base font-bold text-foreground">
                  {badge.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-normal">
                  {badge.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
