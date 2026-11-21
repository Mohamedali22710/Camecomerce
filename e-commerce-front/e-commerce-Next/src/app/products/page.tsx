"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import api from "@/lib/api";
import { Badge } from "@/components/base/badge";
import { ProductGridSkeleton } from "@/components/widgets/skeletons";
import { Card, CardContent, CardHeader } from "@/components/base/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/select";
import { AspectRatio } from "@/components/base/aspect-ratio";
import { PaginationAdvanced2 } from "@/components/widgets/pagination-advanced-2";
import { getLocalizedField, parseImageURLs, useFormatPrice } from "@/lib/locale";
import type { Locale } from "@/lib/locale";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

interface Product {
  _id: string;
  en_name: string;
  ar_name?: string;
  en_description: string;
  ar_description?: string;
  price: number;
  discount: number | null;
  stock?: number;
  images?: string[];
  imageURLs?: string;
}

export default function ProductsPage() {
  const t = useTranslations("products");
  const locale = useLocale() as Locale;
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("");

  const sortOptions: Record<string, string> = {
    price_asc: t("priceLowHigh"),
    price_desc: t("priceHighLow"),
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (sort) params.set("sort", sort);
      const minPrice = searchParams.get("minPrice");
      const maxPrice = searchParams.get("maxPrice");
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      const cat = searchParams.get("category");
      const sub = searchParams.get("subcategory");
      const search = searchParams.get("search");
      if (search) params.set("search", search);

      let url = `/products?${params}`;
      if (sub) {
        url = `/products/subcategory/${sub}?${params}`;
      } else if (cat) {
        url = `/products/category/${cat}?${params}`;
      }

      const res = await api.get(url);
      const data = res.data?.data;
      const list = data?.products || data;
      setProducts(Array.isArray(list) ? list : []);
      if (data?.totalPages) setTotalPages(data.totalPages);
      if (data?.total) setTotalPages(Math.ceil(data.total / 12));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, sort, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [searchParams, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const formatPrice = useFormatPrice(locale);

  return (
    <motion.section
      className="py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="mb-6 flex flex-wrap items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => v !== null && setSort(v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder={t("sortBy")}>
                {(val) => (val && sortOptions[val] ? sortOptions[val] : t("sortBy"))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_asc">{t("priceLowHigh")}</SelectItem>
              <SelectItem value="price_desc">{t("priceHighLow")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <motion.p
          className="py-16 text-center text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {t("noProducts")}
        </motion.p>
      ) : (
        <>
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial="initial"
            animate="animate"
            variants={stagger}
            key={page}
          >
            <AnimatePresence mode="popLayout">
              {products.map((product) => {
                const hasDiscount = typeof product.discount === "number" && product.discount > 0;
                const salePrice = hasDiscount
                  ? product.price - (product.price * (product.discount as number)) / 100
                  : null;
                const isOutOfStock = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;
                return (
                  <motion.div
                    key={product._id}
                    layout
                    variants={fadeInUp}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Link href={`/products/${product._id}`}>
                      <motion.div
                        whileHover={{ y: -6 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Card className="h-full overflow-hidden">
                          <CardHeader className="relative block p-0">
                            <AspectRatio ratio={1}>
                              <Image
                                src={parseImageURLs(product)[0]}
                                alt={getLocalizedField(product, "name", locale)}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                              />
                            </AspectRatio>
                            {hasDiscount && (
                              <Badge className="absolute left-3 top-3">-{product.discount}%</Badge>
                            )}
                          </CardHeader>
                          <CardContent className="p-4">
                            <h3 className="truncate font-medium">{getLocalizedField(product, "name", locale)}</h3>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {getLocalizedField(product, "description", locale)}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {formatPrice(salePrice ?? product.price)}
                                </span>
                                {salePrice && (
                                  <span className="text-sm text-muted-foreground line-through">
                                    {formatPrice(product.price)}
                                  </span>
                                )}
                              </div>
                              {isOutOfStock && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                  <span className="size-1.5 rounded-full bg-rose-500" />
                                  {locale === "ar" ? "نفدت الكمية" : "Sold Out"}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {totalPages > 1 && (
            <motion.div
              className="mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <PaginationAdvanced2
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </motion.div>
          )}
        </>
      )}
    </motion.section>
  );
}
