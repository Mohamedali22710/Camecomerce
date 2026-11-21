interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface FilterSection {
  id: string;
  title: string;
  options: FilterOption[];
}

interface ActiveFilter {
  sectionId: string;
  optionId: string;
  label: string;
}

export type { FilterOption, FilterSection, ActiveFilter };
