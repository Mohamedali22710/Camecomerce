import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "التصنيفات والأنظمة الأمنية",
  description:
    "استكشف تصنيفات وفئات كاميرات المراقبة المتقدمة والأنظمة الأمنية والشبكات من متجر الحارث الذكي في السعودية.",
  alternates: {
    canonical: "/categories",
  },
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

