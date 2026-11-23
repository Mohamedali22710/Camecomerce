import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المنتجات وكاميرات المراقبة",
  description:
    "تصفح تشكيلة واسعة من أحدث كاميرات المراقبة، أجهزة التسجيل NVR و DVR، أنظمة الإنتركوم، والملحقات الأمنية من متجر الحارث الذكي في السعودية.",
  alternates: {
    canonical: "/products",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

