"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/base/button";
import { useCart } from "@/contexts/CartContext";
import type { FormType, ProductFormProps } from "./types";
import { formSchema } from "./types";

const ProductForm = ({ product }: ProductFormProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantity: 1 },
  });

  const { addItem } = useCart();
  const inStock =
    product?.stock === undefined || product?.stock === null
      ? true
      : Number(product.stock) > 0;
  const isAr = product?.locale === "ar";

  function onSubmit(values: FormType) {
    if (!inStock) return;
    if (product) {
      addItem({
        _id: String(product._id),
        name: product.name,
        image: product.images[0] || "/placeholder.svg",
        price: product.salePrice ?? product.price,
        originalPrice: product.originalPrice,
        quantity: values.quantity || 1,
        stock: product.stock,
        inStock,
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!inStock}
      >
        {!inStock
          ? (isAr ? "نفدت الكمية" : "Sold Out")
          : (isAr ? "أضف إلى السلة" : "Add to Cart")}
      </Button>
    </form>
  );
};

export { ProductForm };
