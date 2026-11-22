"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { Cctv } from "lucide-react";
import { Separator } from "@/components/base/separator";
import { cn } from "@/lib/utils";

import { ContactSection } from "./contact-section";
import { FooterLinksSection } from "./footer-links-section";
import { NewsletterSection } from "./newsletter-section";
import {
  CONTACT_LINKS,
  FOOTER_LINKS,
} from "./types";
import type { EcommerceFooter1Props } from "./types";
import { LocaleSwitcher } from "@/components/widgets/locale-switcher";

const EcommerceFooter1 = ({
  footerLinks = FOOTER_LINKS,
  contactLinks = CONTACT_LINKS,
  className,
}: EcommerceFooter1Props) => {
  const t = useTranslations("footer");
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <footer className={cn("pt-12 pb-8 border-t border-border bg-card/50", className)}>
      <div className="container mx-auto space-y-10 px-4">
        {/* Top 5-col Grid: Newsletter + 3 link columns + Contact */}
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <NewsletterSection
              title={t("newsletter")}
              description={t("newsletterDesc")}
            />
          </div>
          <FooterLinksSection sections={footerLinks} />
          <ContactSection links={contactLinks} />
        </div>

        {/* Center Divider with Brand Mark */}
        <div>
          <div className="flex items-center justify-between gap-4 md:gap-8">
            <Separator className="flex-1" />
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5 group shrink-0">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#101D35] to-[#2563EB] text-white shadow-xs transition-transform group-hover:scale-105">
                  <Cctv className="size-4.5 text-white" />
                </div>
                <div className="flex flex-col text-start">
                  <span className="font-bold text-sm text-foreground tracking-tight leading-tight">
                    {t("brandName")}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none">
                    {t("slogan")}
                  </span>
                </div>
              </Link>
            </div>
            <Separator className="flex-1" />
          </div>
        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <p className="text-muted-foreground">
            {t("copyrightText") || (isAr
              ? `جميع الحقوق محفوظة © 2026 الحارث الذكي لكاميرات المراقبة.`
              : `Copyright © 2026 الحارث الذكي CCTV. All rights reserved.`)}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {/* Mada Payment Badge */}
              <div className="flex h-6 items-center rounded border border-border bg-background px-2 py-0.5 text-[10px] font-bold tracking-tight text-foreground shadow-xs">
                مدى | mada
              </div>
              <Image
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/visa.svg"
                alt="Visa"
                width={44}
                height={22}
                style={{ width: "auto", height: "auto" }}
                className="opacity-90 hover:opacity-100 transition-opacity"
              />
              <Image
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/payment-methods/mastercard.svg"
                alt="Mastercard"
                width={44}
                height={22}
                style={{ width: "auto", height: "auto" }}
                className="opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
};

export { EcommerceFooter1 };
