"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/base/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/base/field";
import { Input } from "@/components/base/input";

export const ContactFields = () => {
  const form = useFormContext();
  const t = useTranslations("checkout");

  return (
    <FieldGroup className="gap-3.5">
      <Controller
        name="contactInfo.email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              className="text-sm font-normal"
              htmlFor="checkout-email"
            >
              {t("email")}
            </FieldLabel>
            <Input
              {...field}
              id="checkout-email"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="contactInfo.subscribe"
        control={form.control}
        render={({ field }) => (
          <Field orientation="horizontal">
            <Checkbox
              id="checkout-subscribe"
              name={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <FieldLabel htmlFor="checkout-subscribe" className="font-normal">
              {t("subscribeOffers")}
            </FieldLabel>
          </Field>
        )}
      />
    </FieldGroup>
  );
};
