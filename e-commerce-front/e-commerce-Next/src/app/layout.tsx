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

export const metadata: Metadata = {
  title: {
    default: "الحارث الذكي | كاميرات المراقبة والأنظمة الأمنية",
    template: "%s | الحارث الذكي",
  },
  description:
    "متجر الحارث الذكي — حلول وكاميرات المراقبة المتقدمة والأنظمة الأمنية الذكية في المملكة العربية السعودية.",
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
