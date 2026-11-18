"use client";

import { useLocale } from "next-intl";
import { Phone, ShieldCheck, Truck } from "lucide-react";

export function TopUtilityBar() {
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <div className="bg-[#101D35] text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
      <div className="container mx-auto flex items-center justify-between gap-4">
        {/* Support & Contact */}
        <div className="flex items-center gap-3">
          <a
            href="tel:+966500000000"
            className="flex items-center gap-1.5 hover:text-white transition-colors text-slate-200"
            dir="ltr"
          >
            <Phone className="size-3.5 text-[#2563EB]" />
            <span className="font-medium">+966 50 000 0000</span>
          </a>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-300">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            {isAr ? "أنظمة أمنية معتمدة وضمان سنتين" : "Certified Security & 2-Year Warranty"}
          </span>
        </div>

        {/* Shipping highlight */}
        <div className="hidden md:flex items-center gap-1 text-slate-300 text-xs">
          <Truck className="size-3.5 text-[#F59E0B]" />
          <span>
            {isAr
              ? "شحن وتغطية تركيب لكافة مناطق المملكة"
              : "Fast shipping & installation across KSA"}
          </span>
        </div>

        {/* Currency & Region */}
        <div className="flex items-center gap-3 text-slate-300">
          <span className="inline-flex items-center gap-1">
            <span className="text-[11px] font-semibold tracking-wider text-slate-200">SAR</span>
            <span className="text-slate-400">({isAr ? "ر.س" : "SAR"})</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-medium">
            {isAr ? "المملكة العربية السعودية 🇸🇦" : "Saudi Arabia 🇸🇦"}
          </span>
        </div>
      </div>
    </div>
  );
}

