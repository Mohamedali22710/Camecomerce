"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/base/badge";
import { Button } from "@/components/base/button";
import { Checkbox } from "@/components/base/checkbox";
import { Separator } from "@/components/base/separator";
import { cn } from "@/lib/utils";

import { Collapsible } from "./collapsible";
import type { ActiveFilter, FilterSection } from "./types";

function FilterSectionBlock({
  section,
  selected,
  onToggle,
}: {
  section: FilterSection;
  selected: string[];
  onToggle: (sectionId: string, optionId: string, label: string) => void;
}) {
  const t = useTranslations("sidebar");
  const title =
    section.title ||
    (section.id === "category"
      ? t("category")
      : section.id === "subcategory"
      ? t("subcategory")
      : section.id);

  return (
    <Collapsible title={title}>
      <div className="space-y-2.5">
        {section.options.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-2.5 group"
          >
            <Checkbox
              id={`${section.id}-${opt.id}`}
              checked={selected.includes(opt.id)}
              onCheckedChange={() => onToggle(section.id, opt.id, opt.label)}
            />
            <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {opt.label}
            </span>
            <span className="text-xs text-muted-foreground/60">
              ({opt.count})
            </span>
          </label>
        ))}
      </div>
    </Collapsible>
  );
}

function PriceRange({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApply,
}: {
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onApply: () => void;
}) {
  const t = useTranslations("sidebar");
  const currency = t("currency");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onApply();
    }
  };

  return (
    <Collapsible title={t("priceRange")}>
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("min")} ({currency})
            </label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("max")} ({currency})
            </label>
            <input
              type="number"
              min={0}
              placeholder="1000"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onApply}
          className="w-full h-8 text-xs font-medium border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
        >
          {t("filter")}
        </Button>
      </div>
    </Collapsible>
  );
}

function ActiveFilters({
  filters,
  onRemove,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onRemove: (sectionId: string, optionId: string) => void;
  onClearAll: () => void;
}) {
  const t = useTranslations("sidebar");
  if (filters.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          {t("active")}
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {t("clearAll")}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Badge
            key={`${f.sectionId}-${f.optionId}`}
            variant="secondary"
            className="gap-1 pr-1 text-xs font-normal"
          >
            {f.label}
            <button
              type="button"
              onClick={() => onRemove(f.sectionId, f.optionId)}
              className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 transition-colors p-0.5"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({
  checkboxState,
  minPrice,
  maxPrice,
  activeFilters,
  categorySection,
  subcategorySection,
  onCheckboxToggle,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyPrice,
  onRemoveFilter,
  onClearAll,
}: {
  checkboxState: Record<string, string[]>;
  minPrice: string;
  maxPrice: string;
  activeFilters: ActiveFilter[];
  categorySection?: FilterSection;
  subcategorySection?: FilterSection | null;
  onCheckboxToggle: (sectionId: string, optionId: string, label: string) => void;
  onMinPriceChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onApplyPrice: () => void;
  onRemoveFilter: (sectionId: string, optionId: string) => void;
  onClearAll: () => void;
}) {
  const t = useTranslations("sidebar");
  const isCategoryActive = (checkboxState["category"] ?? []).length > 0;

  return (
    <div className="space-y-1">
      <ActiveFilters
        filters={activeFilters}
        onRemove={onRemoveFilter}
        onClearAll={onClearAll}
      />
      {activeFilters.length > 0 && <Separator className="mb-4" />}
      <div className="space-y-5">
        <FilterSectionBlock
          section={categorySection ?? { id: "category", title: t("category"), options: [] }}
          selected={checkboxState["category"] ?? []}
          onToggle={onCheckboxToggle}
        />
        {isCategoryActive && subcategorySection && subcategorySection.options.length > 0 && (
          <>
            <Separator />
            <FilterSectionBlock
              section={subcategorySection}
              selected={checkboxState["subcategory"] ?? []}
              onToggle={onCheckboxToggle}
            />
          </>
        )}
        <Separator />
        <PriceRange
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={onMinPriceChange}
          onMaxPriceChange={onMaxPriceChange}
          onApply={onApplyPrice}
        />
      </div>
    </div>
  );
}

export { SidebarContent };
export type { ActiveFilter, FilterSection };
