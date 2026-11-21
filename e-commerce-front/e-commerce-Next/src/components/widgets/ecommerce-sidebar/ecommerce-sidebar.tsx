"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { Badge } from "@/components/base/badge";
import { Button } from "@/components/base/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/base/sheet";
import { getLocalizedField } from "@/lib/locale";
import type { Locale } from "@/lib/locale";
import api from "@/lib/api";

import { SidebarContent, type ActiveFilter, type FilterSection } from "./filters";

export function EcommerceSidebar() {
  const locale = useLocale() as Locale;
  const t = useTranslations("sidebar");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [rawCategories, setRawCategories] = useState<any[]>([]);
  const [categories, setCategories] = useState<FilterSection>({
    id: "category",
    title: t("category"),
    options: [],
  });

  const [checkboxState, setCheckboxState] = useState<Record<string, string[]>>(() => {
    const sub = searchParams.get("subcategory");
    const cat = searchParams.get("category");
    const initial: Record<string, string[]> = {};
    if (sub) initial.subcategory = [sub];
    if (cat) initial.category = [cat];
    return initial;
  });

  const [minPriceInput, setMinPriceInput] = useState(() => searchParams.get("minPrice") || "");
  const [maxPriceInput, setMaxPriceInput] = useState(() => searchParams.get("maxPrice") || "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const catRes = await api.get("/category");
        const catData: any[] = catRes.data?.data || catRes.data || [];
        setRawCategories(catData);

        const catOptions = catData.map((c: any) => {
          const count =
            typeof c.productCount === "number"
              ? c.productCount
              : (c.subcategories || []).reduce(
                  (sum: number, s: any) =>
                    sum +
                    (typeof s.productCount === "number"
                      ? s.productCount
                      : Array.isArray(s.products)
                      ? s.products.length
                      : 0),
                  0,
                );
          return {
            id: String(c._id || c.id),
            label: getLocalizedField(c, "name", locale) || c.en_name,
            count,
          };
        });

        setCategories({
          id: "category",
          title: t("category"),
          options: catOptions,
        });
      } catch {
        // silent
      }
    })();
  }, [locale]);

  useEffect(() => {
    const sub = searchParams.get("subcategory");
    const cat = searchParams.get("category");
    const next: Record<string, string[]> = {};
    if (cat) {
      next.category = [cat];
    } else if (sub && rawCategories.length > 0) {
      const parent = rawCategories.find((c: any) =>
        (c.subcategories || []).some(
          (s: any) => String(s._id || s.id) === String(sub),
        ),
      );
      if (parent) {
        next.category = [String(parent._id || parent.id)];
      }
    }
    if (sub) {
      next.subcategory = [sub];
    }
    setCheckboxState(next);
  }, [searchParams, rawCategories]);

  useEffect(() => {
    setMinPriceInput(searchParams.get("minPrice") || "");
    setMaxPriceInput(searchParams.get("maxPrice") || "");
  }, [searchParams]);

  // Compute active category and its subcategories dynamically
  const selectedCategoryId =
    checkboxState["category"]?.[0] || searchParams.get("category");

  const subcategorySection: FilterSection | null = (() => {
    if (!selectedCategoryId) return null;
    const selectedCat = rawCategories.find(
      (c: any) => String(c._id || c.id) === String(selectedCategoryId),
    );
    if (!selectedCat) return null;

    const options = (selectedCat.subcategories || [])
      .filter((s: any) => s.isActive !== false)
      .map((s: any) => {
        const count =
          typeof s.productCount === "number"
            ? s.productCount
            : Array.isArray(s.products)
            ? s.products.length
            : 0;
        return {
          id: String(s._id || s.id),
          label: getLocalizedField(s, "name", locale) || s.en_name,
          count,
        };
      });

    return {
      id: "subcategory",
      title: t("subcategory"),
      options,
    };
  })();

  const sections: FilterSection[] = subcategorySection
    ? [categories, subcategorySection]
    : [categories];

  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");

  const checkboxActiveFilters: ActiveFilter[] = Object.entries(checkboxState).flatMap(
    ([sectionId, ids]) =>
      ids
        .map((optionId) => {
          const section = sections.find((s) => s.id === sectionId);
          const option = section?.options.find((o) => o.id === optionId);
          if (!option?.label) return null;
          return { sectionId, optionId, label: option.label };
        })
        .filter((item): item is ActiveFilter => item !== null),
  );

  const priceActiveFilters: ActiveFilter[] = [];
  if (minPriceParam && maxPriceParam) {
    priceActiveFilters.push({
      sectionId: "price",
      optionId: "range",
      label: `${minPriceParam} - ${maxPriceParam} ${t("currency")}`,
    });
  } else if (minPriceParam) {
    priceActiveFilters.push({
      sectionId: "price",
      optionId: "min",
      label: `≥ ${minPriceParam} ${t("currency")}`,
    });
  } else if (maxPriceParam) {
    priceActiveFilters.push({
      sectionId: "price",
      optionId: "max",
      label: `≤ ${maxPriceParam} ${t("currency")}`,
    });
  }

  const activeFilters: ActiveFilter[] = [
    ...checkboxActiveFilters,
    ...priceActiveFilters,
  ];

  function handleCheckboxToggle(
    sectionId: string,
    optionId: string,
    _label: string,
  ) {
    if (sectionId === "category") {
      const current = checkboxState["category"] ?? [];
      const isAlready = current.includes(optionId);
      const nextCat = isAlready ? [] : [optionId];

      setCheckboxState((prev) => ({
        ...prev,
        category: nextCat,
        subcategory: [], // reset subcategory on category change/toggle
      }));

      const params = new URLSearchParams(searchParams.toString());
      if (nextCat.length > 0) {
        params.set("category", nextCat[0]);
      } else {
        params.delete("category");
      }
      params.delete("subcategory");
      params.delete("page");
      router.replace(`${pathname}?${params}`, { scroll: false });
      return;
    }

    if (sectionId === "subcategory") {
      const current = checkboxState["subcategory"] ?? [];
      const isAlready = current.includes(optionId);
      const nextSub = isAlready ? [] : [optionId];

      setCheckboxState((prev) => ({
        ...prev,
        subcategory: nextSub,
      }));

      const params = new URLSearchParams(searchParams.toString());
      if (nextSub.length > 0) {
        params.set("subcategory", nextSub[0]);
      } else {
        params.delete("subcategory");
      }
      params.delete("page");
      router.replace(`${pathname}?${params}`, { scroll: false });
      return;
    }
  }

  function handleApplyPrice() {
    const params = new URLSearchParams(searchParams.toString());
    const min = minPriceInput.trim();
    const max = maxPriceInput.trim();

    if (min !== "" && !isNaN(Number(min)) && Number(min) >= 0) {
      params.set("minPrice", min);
    } else {
      params.delete("minPrice");
    }

    if (max !== "" && !isNaN(Number(max)) && Number(max) >= 0) {
      params.set("maxPrice", max);
    } else {
      params.delete("maxPrice");
    }

    params.delete("page");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  function handleRemoveFilter(sectionId: string, optionId: string) {
    if (sectionId === "price") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("minPrice");
      params.delete("maxPrice");
      params.delete("page");
      setMinPriceInput("");
      setMaxPriceInput("");
      router.replace(`${pathname}?${params}`, { scroll: false });
      return;
    }

    if (sectionId === "category") {
      setCheckboxState((prev) => ({
        ...prev,
        category: [],
        subcategory: [],
      }));
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      params.delete("subcategory");
      params.delete("page");
      router.replace(`${pathname}?${params}`, { scroll: false });
    } else if (sectionId === "subcategory") {
      setCheckboxState((prev) => ({
        ...prev,
        subcategory: [],
      }));
      const params = new URLSearchParams(searchParams.toString());
      params.delete("subcategory");
      params.delete("page");
      router.replace(`${pathname}?${params}`, { scroll: false });
    }
  }

  function handleClearAll() {
    setCheckboxState({});
    setMinPriceInput("");
    setMaxPriceInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subcategory");
    params.delete("category");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("page");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  const sharedProps = {
    checkboxState,
    minPrice: minPriceInput,
    maxPrice: maxPriceInput,
    activeFilters,
    categorySection: categories,
    subcategorySection,
    onCheckboxToggle: handleCheckboxToggle,
    onMinPriceChange: setMinPriceInput,
    onMaxPriceChange: setMaxPriceInput,
    onApplyPrice: handleApplyPrice,
    onRemoveFilter: handleRemoveFilter,
    onClearAll: handleClearAll,
  };

  return (
    <>
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="size-4" />
                {t("filters")}
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            }
          />
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="text-left text-sm font-semibold tracking-widest uppercase">
                {t("filters")}
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-auto h-[calc(100vh-64px)] px-5 py-5">
              <SidebarContent {...sharedProps} />
              <div className="mt-6 pb-2">
                <Button className="w-full" onClick={() => setMobileOpen(false)}>
                  {t("showResults")}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:flex gap-0">
        <aside
          className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            desktopOpen ? "max-w-60" : "max-w-0"
          }`}
        >
          <div className="w-60">
            <div className="sticky top-6">
              <div className="mb-5 flex items-center justify-between pr-2">
                <h2 className="text-sm font-semibold tracking-widest uppercase text-foreground">
                  {t("filters")}
                </h2>
                <button
                  type="button"
                  onClick={() => setDesktopOpen(false)}
                  className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </div>
              <div className="overflow-auto max-h-[calc(100vh-120px)] pr-2">
                <SidebarContent {...sharedProps} />
              </div>
            </div>
          </div>
        </aside>
        <button
          type="button"
          onClick={() => setDesktopOpen(true)}
          className={`sticky top-6 self-start mt-1 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-all duration-300 p-0.5 ${
            desktopOpen ? "opacity-0 pointer-events-none w-0" : "opacity-100 w-auto"
          }`}
          title={t("showFilters")}
        >
          <PanelLeftOpen className="size-4" />
        </button>
      </div>
    </>
  );
}

export default EcommerceSidebar;
