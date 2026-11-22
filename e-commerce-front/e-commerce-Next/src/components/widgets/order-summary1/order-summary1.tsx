import { CheckCircle, CreditCard, Download, MapPin, Package, Printer, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useFormatPrice, type Locale } from "@/lib/locale";

import { AspectRatio } from "@/components/base/aspect-ratio";
import { Badge } from "@/components/base/badge";
import { Button } from "@/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/base/card";
import { Separator } from "@/components/base/separator";
import { cn } from "@/lib/utils";
import Image from "next/image";

import type { OrderSummary1Props, OrderSummaryData } from "./types";
import { DEFAULT_ORDER } from "./types";

const OrderSummary1 = ({
  order = DEFAULT_ORDER,
  className,
}: OrderSummary1Props) => {
  const t = useTranslations("order");
  const locale = useLocale() as Locale;
  const isAr = locale === "ar";
  const formatPrice = useFormatPrice(locale);

  const getStatusBadge = (status: OrderSummaryData["status"]) => {
    const variants: Record<
      OrderSummaryData["status"],
      { label: string; className: string }
    > = {
      confirmed: {
        label: t("statusConfirmed"),
        className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10",
      },
      processing: {
        label: t("statusProcessing"),
        className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10",
      },
      shipped: {
        label: t("statusShipped"),
        className: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/10",
      },
      delivered: {
        label: t("statusDelivered"),
        className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10",
      },
    };
    return variants[status] || {
      label: status,
      className: "bg-muted text-muted-foreground",
    };
  };

  const statusBadge = getStatusBadge(order.status);

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="size-8 text-emerald-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
            {t("thankYou")}
          </h1>
          <p className="text-muted-foreground">
            {t("confirmationEmail")}{" "}
            <span className="font-medium text-foreground">{order.email}</span>
          </p>
        </div>

        <Card className="mb-6 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-sm text-muted-foreground">{t("orderNumber")}</p>
                <p className="font-semibold">{order.orderNumber}</p>
              </div>
              <Separator orientation="vertical" className="hidden h-10 md:block" />
              <div>
                <p className="text-sm text-muted-foreground">{t("orderDate")}</p>
                <p className="font-medium">{order.orderDate}</p>
              </div>
            </div>
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="size-5" />
                  {t("itemsOrdered")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={item._id}>
                    <div className="flex gap-4">
                      <div className="w-20 shrink-0">
                        <AspectRatio ratio={1} className="overflow-hidden rounded-lg bg-muted">
                          <Image src={item.image} alt={item.name} fill sizes="100px" className="object-cover" />
                        </AspectRatio>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        {item.details && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {item.details.map((d, i) => (
                              <span key={d.label}>{d.value}{i < item.details!.length - 1 && " \u00b7 "}</span>
                            ))}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">{t("qty")} {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                        {item.quantity > 1 && (
                          <p className="text-sm text-muted-foreground">{formatPrice(item.price)} {t("each")}</p>
                        )}
                      </div>
                    </div>
                    {index < order.items.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("subtotal")}</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("shipping")}</span>
                    <span>{order.shipping === 0 ? t("free") : formatPrice(order.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("tax")}</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                  {order.discount && order.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>{t("discount")}</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>{t("totalPaid")}</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="size-5" />
                  {t("shippingAddress")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{order.shippingAddress.name}</p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.street}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.country}</p>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{order.shippingMethod}</p>
                    <p className="text-sm text-muted-foreground">{t("estimatedDelivery")} {order.estimatedDelivery}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="size-5" />
                  {t("paymentMethod")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.paymentMethod.type === "card" && (
                  <div className="flex items-center gap-3">
                    <Image src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/visa-icon.svg" alt="Visa" width={32} height={32} />
                    <div>
                      <p className="text-sm font-medium">{order.paymentMethod.cardBrand} {t("endingIn")} {order.paymentMethod.lastFour}</p>
                      <p className="text-sm text-muted-foreground">{t("paymentCompleted")}</p>
                    </div>
                  </div>
                )}
                {order.paymentMethod.type === "paypal" && (
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                      <Image src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/paypal-icon.svg" alt="PayPal" width={20} height={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">PayPal</p>
                      <p className="text-sm text-muted-foreground">{order.paymentMethod.email}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <Button className="w-full" variant="default"><Package className="mr-2 size-4" />{t("trackOrder")}</Button>
                <Button className="w-full" variant="outline"><Download className="mr-2 size-4" />{t("downloadReceipt")}</Button>
                <Button className="w-full" variant="ghost"><Printer className="mr-2 size-4" />{t("printOrder")}</Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="mb-4 text-muted-foreground">{t("question")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" render={<a href="/contact" />} nativeButton={false}>{t("contactSupport")}</Button>
            <Button render={<a href="/products" />} nativeButton={false}>{t("continueShopping")}</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export { OrderSummary1 };
