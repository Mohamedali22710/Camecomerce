import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الفئات الفرعية والملحقات",
  description:
    "تصفح جميع الفئات الفرعية لكاميرات المراقبة، أجهزة الإنتركوم، الكابلات، والملحقات الأمنية من متجر الحارث الذكي في السعودية.",
  alternates: {
    canonical: "/subcategories",
  },
};

export default function SubcategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

