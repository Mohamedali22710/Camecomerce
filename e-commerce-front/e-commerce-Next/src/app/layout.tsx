import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "./globals.css";
import { Navbar1 } from "@/components/widgets/navbar1";
import { EcommerceFooter1 } from "@/components/widgets/ecommerce-footer1";
import { SidebarWrapper } from "@/components/widgets/sidebar-wrapper";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/contexts/CartContext";
import UserProvider from "@/contexts/UserContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { WebVitals } from "@/components/widgets/web-vitals";
import {
  PageTransition,
  LocaleTransition,
} from "@/components/widgets/page-transition";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "الحارث الذكي | كاميرات المراقبة والأنظمة الأمنية الذكية",
    template: "%s | الحارث الذكي",
  },
  description:
    "متجر الحارث الذكي — حلول وكاميرات المراقبة المتقدمة، أنظمة الإنتركوم، والأنظمة الأمنية الذكية والشبكات في المملكة العربية السعودية بأفضل الأسعار وأعلى جودة.",
  keywords: [
    "كاميرات مراقبة",
    "كاميرات مراقبة السعودية",
    "كاميرات هيكفيجن",
    "كاميرات داهوا",
    "انتركوم منزلي",
    "أنظمة أمنية ذكية",
    "تركيب كاميرات مراقبة",
    "كاميرات مراقبة لاسلكية",
    "كاميرات مراقبة IP",
    "أجهزة تسجيل DVR",
    "أجهزة تسجيل NVR",
    "شبكات سلكية ولاسلكية",
    "متجر الحارث الذكي",
    "Security Cameras Saudi",
    "Hikvision",
    "Dahua",
    "CCTV Saudi",
    "Smart Security",
  ],
  authors: [{ name: "الحارث الذكي", url: siteUrl }],
  creator: "الحارث الذكي",
  publisher: "الحارث الذكي",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "ar": "/",
      "en": "/en",
    },
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    alternateLocale: ["en_US"],
    url: siteUrl,
    siteName: "الحارث الذكي | كاميرات المراقبة والأنظمة الأمنية",
    title: "الحارث الذكي | أفضل حلول كاميرات المراقبة والأنظمة الأمنية في السعودية",
    description:
      "متجر الحارث الذكي — حلول وكاميرات المراقبة المتقدمة والأنظمة الأمنية الذكية في المملكة العربية السعودية.",
    images: [
      {
        url: "/logo.svg",
        width: 800,
        height: 600,
        alt: "متجر الحارث الذكي لكاميرات المراقبة",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "الحارث الذكي | كاميرات المراقبة والأنظمة الأمنية",
    description:
      "متجر الحارث الذكي — حلول وكاميرات المراقبة المتقدمة والأنظمة الأمنية الذكية في المملكة العربية السعودية.",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "الحارث الذكي",
    alternateName: "Al-Harith Smart Security Systems",
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      areaServed: "SA",
      availableLanguage: ["Arabic", "English"],
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "الحارث الذكي",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${ibmPlexArabic.variable} ${inter.variable} h-full antialiased overflow-x-hidden max-w-full`}
    >
      <head>
        <link rel="preconnect" href="https://deifkwefumgah.cloudfront.net" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://deifkwefumgah.cloudfront.net" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground overflow-x-hidden max-w-full" suppressHydrationWarning>
        <WebVitals />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleTransition>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={true}
              disableTransitionOnChange
            >
              <UserProvider>
                <CartProvider>
                  <WishlistProvider>
                    <Navbar1 />
                    <div className="container mx-auto flex flex-1 px-4">
                      <SidebarWrapper />
                      <main className="min-w-0 flex-1">
                        <PageTransition>{children}</PageTransition>
                      </main>
                    </div>
                    <EcommerceFooter1 />
                  </WishlistProvider>
                </CartProvider>
              </UserProvider>
            </ThemeProvider>
          </LocaleTransition>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
