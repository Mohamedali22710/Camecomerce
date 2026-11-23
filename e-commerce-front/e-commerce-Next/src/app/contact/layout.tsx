import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "اتصل بنا",
  description:
    "تواصل مع متجر الحارث الذكي لكاميرات المراقبة والأنظمة الأمنية في السعودية لطلب عروض الأسعار، الاستشارات الفنية والتركيب.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

