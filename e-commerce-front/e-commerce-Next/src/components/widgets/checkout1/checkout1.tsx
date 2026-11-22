"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import api from "@/lib/api";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/base/accordion";
import { Button } from "@/components/base/button";
import {
  Logo,
  LogoImageDesktop,
  LogoImageMobile,
} from "@/components/widgets/logo";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { User } from "@/contexts/UserContext";

import { AddressFields } from "./address-fields";
import { Cart } from "./cart";
import { ContactFields } from "./contact-fields";
import { PaymentFields } from "./payment-fields";
import { ShippingMethodFields } from "./shipping-method-fields";
import { PAYMENT_METHODS, checkoutFormSchema } from "./types";
import type { Checkout1Props, CheckoutFormType, CartItem as CheckoutCartItem } from "./types";

const Checkout1 = ({ cartItems: propCartItems, className }: Checkout1Props) => {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [activeAccordion, setActiveAccordion] = useState<string[]>(["item-1"]);
  const [submitting, setSubmitting] = useState(false);
  const { items: ctxItems, clearCart, hasOutOfStockItems } = useCart();
  const { userToken } = useContext(User)!;
  const router = useRouter();

  useEffect(() => {
    if (!userToken) {
      router.replace("/login");
    }
  }, [userToken, router]);

  useEffect(() => {
    if (!propCartItems && ctxItems.length === 0) {
      router.replace("/cart");
    } else if (hasOutOfStockItems) {
      router.replace("/cart");
    }
  }, [propCartItems, ctxItems, hasOutOfStockItems, router]);

  const cartItems: CheckoutCartItem[] = useMemo(() => {
    if (propCartItems) return propCartItems;
    return ctxItems.map((item) => ({
      product_id: item.productId || item._id,
      link: item.link || "#",
      name: item.name,
      image: item.image,
      price: {
        regular: item.originalPrice ?? item.price,
        sale: item.originalPrice ? item.price : undefined,
        currency: "SAR",
      },
      quantity: item.quantity,
      details: item.details || [],
    }));
  }, [propCartItems, ctxItems]);

  const defaultProducts = useMemo(() => cartItems.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price.sale ?? item.price.regular,
  })), [cartItems]);

  const form = useForm({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      payment: {
        method: PAYMENT_METHODS.creditCard,
      },
      products: defaultProducts,
    },
  });

  const onSubmit = async (data: CheckoutFormType) => {
    setSubmitting(true);
    try {
      const paymentMethod = data.payment.method === "creditCard" ? "card" : "cod";
      const payload = {
        items: data.products.map((p) => ({
          productId: String(p.product_id),
          quantity: p.quantity,
        })),
        paymentMethod,
        shippingAddress: {
          fullName: data.address.fullName,
          phone: data.address.phone,
          street: data.address.street,
          city: data.address.city,
          state: data.address.state,
          zipCode: data.address.zipCode,
          country: data.address.country,
        },
      };

      const res = await api.post("/order", payload);
      const orderRes = res.data?.data || res.data;

      clearCart();

      if (orderRes?.url) {
        window.location.href = orderRes.url;
      } else {
        try {
          sessionStorage.setItem("last-order", JSON.stringify(orderRes));
        } catch {}
        router.push("/order");
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const onContinue = (value: string) => {
    setActiveAccordion([value]);
  };

  const handleOnValueChange = (value: string[]) => {
    setActiveAccordion(value);
  };

  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="flex flex-col gap-6 pb-8 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
              <Image src="/logo.svg" alt="logo" width={36} height={36} className="size-9 rounded-lg" unoptimized />
              <div className="flex flex-col text-start">
                <span className="font-bold text-lg text-foreground leading-tight">
                  {tCommon("brandName")}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground leading-none">
                  {tCommon("brandSlogan")}
                </span>
              </div>
            </Link>
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:gap-17.5">
              <div>
                <Accordion
                  className="w-full"
                  value={activeAccordion}
                  onValueChange={handleOnValueChange}
                >
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="px-1 py-7 text-lg font-semibold hover:no-underline [&>svg:last-child]:hidden [&[data-state=closed]>svg:nth-of-type(2)]:hidden [&[data-state=open]>svg:nth-of-type(1)]:hidden [&[data-state=open]>svg:nth-of-type(2)]:block">
                      {t("contact")}
                      <Plus className="pointer-events-none size-4 shrink-0 self-center text-muted-foreground" />
                      <Minus className="pointer-events-none hidden size-4 shrink-0 self-center text-muted-foreground" />
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pb-7">
                      <div className="space-y-7">
                        <ContactFields />
                        <Button
                          type="button"
                          className="w-full"
                          variant="secondary"
                          onClick={() => onContinue("item-2")}
                        >
                          {t("continue")}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="px-1 py-7 text-lg font-semibold hover:no-underline [&>svg:last-child]:hidden [&[data-state=closed]>svg:nth-of-type(2)]:hidden [&[data-state=open]>svg:nth-of-type(1)]:hidden [&[data-state=open]>svg:nth-of-type(2)]:block">
                      {t("address")}
                      <Plus className="pointer-events-none size-4 shrink-0 self-center text-muted-foreground" />
                      <Minus className="pointer-events-none hidden size-4 shrink-0 self-center text-muted-foreground" />
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pb-7">
                      <div className="space-y-7">
                        <AddressFields />
                        <Button
                          type="button"
                          className="w-full"
                          variant="secondary"
                          onClick={() => onContinue("item-3")}
                        >
                          {t("continue")}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="px-1 py-7 text-lg font-semibold hover:no-underline [&>svg:last-child]:hidden [&[data-state=closed]>svg:nth-of-type(2)]:hidden [&[data-state=open]>svg:nth-of-type(1)]:hidden [&[data-state=open]>svg:nth-of-type(2)]:block">
                      {t("shippingMethod")}
                      <Plus className="pointer-events-none size-4 shrink-0 self-center text-muted-foreground" />
                      <Minus className="pointer-events-none hidden size-4 shrink-0 self-center text-muted-foreground" />
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pb-7">
                      <div className="space-y-7">
                        <ShippingMethodFields />
                        <Button
                          type="button"
                          className="w-full"
                          variant="secondary"
                          onClick={() => onContinue("item-4")}
                        >
                          {t("continue")}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="px-1 py-7 text-lg font-semibold hover:no-underline [&>svg:last-child]:hidden [&[data-state=closed]>svg:nth-of-type(2)]:hidden [&[data-state=open]>svg:nth-of-type(1)]:hidden [&[data-state=open]>svg:nth-of-type(2)]:block">
                      {t("payment")}
                      <Plus className="pointer-events-none size-4 shrink-0 self-center text-muted-foreground" />
                      <Minus className="pointer-events-none hidden size-4 shrink-0 self-center text-muted-foreground" />
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pb-7">
                      <div className="space-y-7">
                        <PaymentFields />
                        <Button type="submit" className="w-full" disabled={submitting}>
                          {submitting ? t("processing") : t("placeOrder")}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <div>
                <Cart form={form} cartItems={cartItems} />
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </section>
  );
};

export { Checkout1 };
