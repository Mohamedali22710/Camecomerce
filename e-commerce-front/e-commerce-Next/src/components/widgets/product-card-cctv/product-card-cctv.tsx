"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, Heart, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { getLocalizedField, parseImageURLs, useFormatPrice, type Locale } from "@/lib/locale";
import { AspectRatio } from "@/components/base/aspect-ratio";
import { Button } from "@/components/base/button";
import { cn } from "@/lib/utils";
import type { ProductCardCctvProps } from "./types";

export function ProductCardCctv({ product, className, priority = false }: ProductCardCctvProps) {
  const t = useTranslations("productDetail");
  const locale = useLocale() as Locale;
  const isAr = locale === "ar";
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();

  const [mounted, setMounted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const name = getLocalizedField(product, "name", locale) || product.en_name || (isAr ? "منتج أمني" : "Security Product");
  const images = parseImageURLs(product);
  const imageSrc = images[0] || "/placeholder.svg";

  const hasDiscount = typeof product.discount === "number" && product.discount > 0;
  const finalPrice = hasDiscount
    ? Math.round((product.price - (product.price * (product.discount as number)) / 100) * 100) / 100
    : product.price;

  const formatPrice = useFormatPrice(locale);
  const inWishlist = mounted && isInWishlist(product._id);
  const isOutOfStock = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    addItem({
      _id: product._id,
      productId: product._id,
      name,
      en_name: product.en_name,
      ar_name: product.ar_name,
      image: imageSrc,
      price: finalPrice,
      originalPrice: hasDiscount ? product.price : undefined,
      quantity: 1,
      stock: product.stock,
      inStock: !isOutOfStock,
      link: `/products/${product._id}`,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toggleItem({
      _id: product._id,
      name,
      image: imageSrc,
      price: finalPrice,
      originalPrice: hasDiscount ? product.price : undefined,
      inStock: !isOutOfStock,
      link: `/products/${product._id}`,
    });
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 overflow-hidden",
        className
      )}
    >
      <Link href={`/products/${product._id}`} className="flex flex-col flex-1">
        {/* Image Container with Badges */}
        <div className="relative w-full bg-[#F7F8FA] dark:bg-slate-900/50 overflow-hidden">
          <AspectRatio ratio={1}>
            <Image
              src={imageSrc}
              alt={name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </AspectRatio>

          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute start-3 top-3 z-10">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B] text-slate-900 shadow-xs">
                -{product.discount}%
              </span>
            </div>
          )}

          {/* Wishlist button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={inWishlist ? (isAr ? "إزالة من المفضلة" : "Remove from wishlist") : (isAr ? "إضافة للمفضلة" : "Add to wishlist")}
            className={cn(
              "absolute end-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/95 dark:bg-slate-800/90 shadow-xs border border-border/80 transition-all active:scale-90 hover:scale-105",
              inWishlist ? "text-rose-500 hover:text-rose-600" : "text-slate-500 hover:text-rose-500"
            )}
          >
            <Heart className={cn("size-4 transition-colors", inWishlist && "fill-current")} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col flex-1 p-4 gap-2.5">
          {/* Title */}
          <h3 className="font-semibold text-sm md:text-base text-foreground line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-[#2563EB] transition-colors">
            {name}
          </h3>

          {/* Price Block */}
          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-base md:text-lg font-bold text-foreground tabular-nums">
                {formatPrice(finalPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through tabular-nums">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            {isOutOfStock && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                <span className="size-1.5 rounded-full bg-rose-500" />
                {isAr ? "نفدت الكمية" : "Sold Out"}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Action Footer */}
      <div className="p-4 pt-0">
        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={cn(
            "w-full gap-2 text-xs md:text-sm font-medium transition-all h-9 rounded-lg shadow-xs",
            isOutOfStock
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60 hover:bg-muted"
              : isAdded
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-[#2563EB] hover:bg-blue-700 text-white"
          )}
        >
          {isOutOfStock ? (
            <span>{isAr ? "نفدت الكمية" : "Sold Out"}</span>
          ) : isAdded ? (
            <>
              <Check className="size-4" />
              <span>{isAr ? "تمت الإضافة للسلة" : "Added to Cart"}</span>
            </>
          ) : (
            <>
              <ShoppingCart className="size-4" />
              <span>{t("addToCart")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
