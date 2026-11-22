"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/base/field";
import { RadioGroup, RadioGroupItem } from "@/components/base/radio-group";

export const ShippingMethodFields = () => {
  const form = useFormContext();
  const t = useTranslations("checkout");

  return (
    <Controller
      name="shippingMethod"
      control={form.control}
      defaultValue="standard"
      render={({ field, fieldState }) => (
        <Field>
          <RadioGroup
            name={field.name}
            value={field.value || "standard"}
            onValueChange={field.onChange}
            className="flex max-sm:flex-col"
          >
            <FieldLabel htmlFor="checkout-shippingMethod-1">
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldTitle>{t("standardShipping")}</FieldTitle>
                  <FieldDescription>{t("standardShippingDesc")}</FieldDescription>
                </FieldContent>
                <div className="flex gap-3.5">
                  <p className="text-sm font-semibold text-emerald-600">{t("free")}</p>
                  <RadioGroupItem
                    value="standard"
                    id="checkout-shippingMethod-1"
                    aria-invalid={fieldState.invalid}
                  />
                </div>
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="checkout-shippingMethod-2">
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldTitle>{t("expressShipping")}</FieldTitle>
                  <FieldDescription>{t("expressShippingDesc")}</FieldDescription>
                </FieldContent>
                <div className="flex gap-3.5">
                  <p className="text-sm font-semibold">{t("expressPrice")}</p>
                  <RadioGroupItem
                    value="express"
                    id="checkout-shippingMethod-2"
                    aria-invalid={fieldState.invalid}
                  />
                </div>
              </Field>
            </FieldLabel>
          </RadioGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};
