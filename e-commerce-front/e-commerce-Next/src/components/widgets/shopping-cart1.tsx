"use client";

import { AlertCircle, Minus, Plus, Trash2, XCircle } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import api from "@/lib/api";
import { getLocalizedField, useFormatPrice, type Locale } from "@/lib/locale";

import { AspectRatio } from "@/components/base/aspect-ratio";
import { Button } from "@/components/base/button";
import { Separator } from "@/components/base/separator";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { User } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";

const ShoppingCart1 = () => {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const { items, removeItem, updateQuantity, clearCart, subtotal, shippingCost, total, currency, fetchFromApi, refreshStock, hasOutOfStockItems } = useCart();
  const { userToken, userRole } = useContext(User)!;
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshStock();
  }, []);

  useEffect(() => {
    if (userToken && userRole) {
      fetchFromApi(userToken, userRole);
    }
  }, [userToken, userRole]);

  const handleRemove = (idOrKey: string) => {
    removeItem(idOrKey);
  };

  const handleClearCart = () => {
    clearCart();
  };

  const handleQtyChange = (idOrKey: string, qty: number) => {
    updateQuantity(idOrKey, qty);
  };

  const formatPrice = useFormatPrice(locale);

  if (!mounted) {
    return (
      <section className="py-24 container mx-auto">
        <div className="container max-w-2xl space-y-6">
          <div className="h-8 w-44 bg-muted rounded-md animate-pulse" />
          <div className="space-y-4">
            <div className="h-24 bg-muted/60 rounded-xl animate-pulse" />
            <div className="h-24 bg-muted/60 rounded-xl animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="py-32">
        <div className="container max-w-lg text-center">
          <h1 className="mb-4 text-2xl font-semibold">{t("empty")}</h1>
          <p className="mb-8 text-muted-foreground">
            {t("emptyHint")}
          </p>
          <Button render={<Link href="/products" />} nativeButton={false}>{t("continueShopping")}</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-32 container mx-auto">
      <div className="container max-w-2xl">
        <h1 className="mb-8 text-3xl font-semibold">{t("title")}</h1>

        <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const isItemOutOfStock = item.inStock === false || (item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0);
            const itemKey = item.productId || item._id;
            return (
              <motion.div
                key={itemKey}
                layout
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-4 transition-colors",
                  isItemOutOfStock
                    ? "border-rose-300/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20"
                    : "border-border"
                )}
              >
                <Link href={`/products/${item.productId || item._id}`} className="w-20 shrink-0">
                  <AspectRatio ratio={1} className="overflow-hidden rounded-md">
                    <Image
                      src={item.image}
                      alt={getLocalizedField(item, "name", locale) || item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </AspectRatio>
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.productId || item._id}`} className="hover:underline">
                    <h3 className="truncate font-medium">{getLocalizedField(item, "name", locale) || item.name}</h3>
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(item.price)} {t("each")}
                  </p>
                  {isItemOutOfStock && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                        <span className="size-1.5 rounded-full bg-rose-500" />
                        {t("itemOutOfStock")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => handleQtyChange(item.productId || item._id, item.quantity - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={isItemOutOfStock || (item.stock !== undefined && item.quantity >= item.stock)}
                    onClick={() => handleQtyChange(item.productId || item._id, item.quantity + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>

                <div className="w-20 text-right">
                  <p className="font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-rose-600"
                  onClick={() => handleRemove(item.productId || item._id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleClearCart}>
            <XCircle className="size-4" />
            Clear Cart
          </Button>
        </motion.div>

        <Separator className="my-6" />

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {hasOutOfStockItems && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs md:text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <p className="leading-snug">
                {t("cartHasOutOfStock")}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("shipping")}</span>
            <span>{shippingCost > 0 ? formatPrice(shippingCost) : t("free")}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>{t("total")}</span>
            <span>{formatPrice(total)}</span>
          </div>

          <motion.div whileHover={hasOutOfStockItems ? {} : { scale: 1.02 }} whileTap={hasOutOfStockItems ? {} : { scale: 0.98 }}>
            <Button
              size="lg"
              className={cn("w-full", hasOutOfStockItems && "cursor-not-allowed opacity-50 bg-muted text-muted-foreground hover:bg-muted")}
              disabled={hasOutOfStockItems}
              onClick={() => {
                if (!hasOutOfStockItems) {
                  router.push("/checkout");
                }
              }}
            >
              {t("checkout")}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export { ShoppingCart1 };
