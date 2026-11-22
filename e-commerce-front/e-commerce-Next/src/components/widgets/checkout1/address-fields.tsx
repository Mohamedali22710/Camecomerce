"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/base/field";
import { Input } from "@/components/base/input";

export const AddressFields = () => {
  const form = useFormContext();
  const t = useTranslations("checkout");

  return (
    <FieldGroup className="gap-3.5">
      <Controller
        name="address.country"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              className="text-sm font-normal"
              htmlFor="checkout-country"
            >
              {t("country")}
            </FieldLabel>
            <Input
              {...field}
              id="checkout-country"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="address.fullName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              className="text-sm font-normal"
              htmlFor="checkout-fullName"
            >
              {t("fullName")}
            </FieldLabel>
            <Input
              {...field}
              id="checkout-fullName"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="address.street"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              className="text-sm font-normal"
              htmlFor="checkout-street"
            >
              {t("street")}
            </FieldLabel>
            <Input
              {...field}
              id="checkout-street"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="address.state"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              className="text-sm font-normal"
              htmlFor="checkout-state"
            >
              {t("state")}
            </FieldLabel>
            <Input
              {...field}
              id="checkout-state"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex gap-3.5 max-sm:flex-col">
        <Controller
          name="address.zipCode"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                className="text-sm font-normal"
                htmlFor="checkout-zipCode"
              >
                {t("zipCode")}
              </FieldLabel>
              <Input
                {...field}
                id="checkout-zipCode"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="address.city"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                className="text-sm font-normal"
                htmlFor="checkout-city"
              >
                {t("city")}
              </FieldLabel>
              <Input
                {...field}
                id="checkout-city"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
      <Controller
        name="address.phone"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              className="text-sm font-normal"
              htmlFor="checkout-phone"
            >
              {t("phone")}
            </FieldLabel>
            <Input
              {...field}
              id="checkout-phone"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  );
};
