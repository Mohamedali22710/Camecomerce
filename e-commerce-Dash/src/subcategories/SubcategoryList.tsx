import * as React from "react";
import {
  List,
  EditButton,
  DeleteButton,
  ReferenceField,
  Pagination,
  RecordContextProvider,
  useDefaultTitle,
  useListContext,
  TopToolbar,
  CreateButton,
  SortButton,
  useRecordContext,
  useGetMany,
  useTranslate,
  useLocale,
} from "react-admin";
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  InputBase,
  Skeleton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ViewToggle, { useViewMode } from "../components/ViewToggle";
import GroupDeleteButton from "./GroupDeleteButton";

const RESOURCE = "subcategories";

const SubcategoriesTitle = () => {
  const translate = useTranslate();
  const title = translate("pos.menu.subcategories", { _: "الفئات الفرعية" });
  return (
    <>
      <title>{`الحارث الذكي - ${title}`}</title>
      <span>{title}</span>
    </>
  );
};

const ListActions = ({ mode, onModeChange }: { mode: "table" | "card"; onModeChange: (v: "table" | "card") => void }) => {
  const translate = useTranslate();
  const { setFilters, filterValues } = useListContext();
  const [search, setSearch] = React.useState(filterValues?.q || "");

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters(value ? { q: value } : {}, null);
  };

  return (
    <TopToolbar sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Box sx={{ display: "flex", alignItems: "center", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "8px", px: 1.5, py: 0.5, minWidth: 220 }}>
        <SearchIcon sx={{ color: "text.secondary", mr: 0.5, fontSize: 20 }} />
        <InputBase
          placeholder={translate("pos.subcategories.search")}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          sx={{ flex: 1, fontSize: "0.875rem" }}
        />
      </Box>
      <SortButton fields={["en_name", "createdAt"]} />
      <CreateButton
        variant="contained"
        sx={{
          backgroundColor: "#2563EB",
          borderRadius: "8px",
          fontWeight: 600,
          boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
          "&:hover": {
            backgroundColor: "#1D4ED8",
          },
        }}
      />
      <ViewToggle resource={RESOURCE} mode={mode} onChange={onModeChange} />
    </TopToolbar>
  );
};

const CategoryChip = () => {
  const record = useRecordContext();
  const locale = useLocale();
  return record ? (
    <Chip
      label={locale === 'ar' ? (record.ar_name || record.en_name) : (record.en_name || record.ar_name)}
      size="small"
      sx={{
        borderRadius: "6px",
        fontWeight: 600,
        backgroundColor: "rgba(37, 99, 235, 0.08)",
        color: "#2563EB",
        borderColor: "rgba(37, 99, 235, 0.2)",
      }}
      variant="outlined"
    />
  ) : null;
};

const SubcategoryGrid = () => {
  const translate = useTranslate();
  const locale = useLocale();
  const { data, error, isPending } = useListContext();
  if (isPending) return (
    <Grid container spacing={2} sx={{ mt: 0 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Skeleton variant="rounded" sx={{ height: 160, borderRadius: "12px" }} />
        </Grid>
      ))}
    </Grid>
  );
  if (error || !data) return null;
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography color="text.secondary" sx={{ fontWeight: 500, fontSize: "0.95rem" }}>
          {translate("ra.page.empty", {
            name: translate("resources.subcategories.name", { smart_count: 2, _: "فئات فرعية" }),
            _: "لا توجد فئات فرعية حتى الآن",
          })}
        </Typography>
      </Box>
    );
  }
  return (
    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
      {data.map((record) => (
        <RecordContextProvider key={record.id} value={record}>
          <Grid key={record.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              sx={{
                borderRadius: "14px",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 2px 4px rgba(16, 29, 53, 0.04)",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0 8px 18px -4px rgba(37, 99, 235, 0.12)",
                  transform: "translateY(-3px)",
                },
              }}
            >
              <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.25, pb: 1, pt: 3 }}>
                <Typography variant="h6" component="h2" align="center" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {record.en_name}
                </Typography>
                <ReferenceField source="categoryId" reference="categories" link="show">
                  <CategoryChip />
                </ReferenceField>
                {record.ar_name && (
                  <Typography
                    variant="body2"
                    align="center"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {record.ar_name}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <EditButton />
                <DeleteButton />
              </CardActions>
            </Card>
          </Grid>
        </RecordContextProvider>
      ))}
    </Grid>
  );
};

const GroupedTable = () => {
  const translate = useTranslate();
  const locale = useLocale();
  const { data, error, isPending } = useListContext();

  const grouped = React.useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { en_name: string; ar_name: string; categoryIds: string[]; ids: string[]; allActive: boolean; someActive: boolean }>();
    data.forEach((r: any) => {
      if (!map.has(r.en_name)) {
        map.set(r.en_name, { en_name: r.en_name, ar_name: r.ar_name, categoryIds: [], ids: [], allActive: true, someActive: false });
      }
      const entry = map.get(r.en_name)!;
      if (!entry.categoryIds.includes(r.categoryId)) {
        entry.categoryIds.push(r.categoryId);
      }
      entry.ids.push(r.id);
      if (r.isActive) entry.someActive = true;
      else entry.allActive = false;
    });
    return Array.from(map.values());
  }, [data]);

  const allCategoryIds = React.useMemo(() => {
    const ids = new Set<string>();
    grouped.forEach(g => g.categoryIds.forEach(c => ids.add(c)));
    return Array.from(ids);
  }, [grouped]);

  const { data: categories } = useGetMany("categories", { ids: allCategoryIds }, { enabled: allCategoryIds.length > 0 });
  const catMap = React.useMemo(() => {
    const m = new Map<string, string>();
    (categories || []).forEach((c: any) => {
      const label = locale === 'ar' ? (c.ar_name || c.en_name) : (c.en_name || c.ar_name);
      m.set(c.id, label);
    });
    return m;
  }, [categories, locale]);

  if (isPending) return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>{translate("pos.subcategories.columns.name_en")}</TableCell>
          <TableCell>{translate("pos.subcategories.columns.name_ar")}</TableCell>
          <TableCell>{translate("pos.subcategories.columns.categories")}</TableCell>
          <TableCell align="center">{translate("pos.subcategories.columns.status")}</TableCell>
          <TableCell align="center">{translate("pos.subcategories.columns.actions")}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton variant="text" sx={{ width: 120 }} /></TableCell>
            <TableCell><Skeleton variant="text" sx={{ width: 100 }} /></TableCell>
            <TableCell><Box sx={{ display: "flex", gap: 0.5 }}><Skeleton variant="rounded" sx={{ width: 60, height: 24 }} /><Skeleton variant="rounded" sx={{ width: 50, height: 24 }} /></Box></TableCell>
            <TableCell align="center"><Skeleton variant="rounded" sx={{ width: 60, height: 24, mx: "auto" }} /></TableCell>
            <TableCell align="center"><Skeleton variant="rounded" sx={{ width: 80, height: 30, mx: "auto" }} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  if (error || !data) return null;

  return (
    <Table
      sx={{
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        mt: 1,
        "& .MuiTableHead-root": {
          backgroundColor: "rgba(16, 29, 53, 0.03)",
        },
        "& .MuiTableCell-head": {
          fontWeight: 700,
          color: "text.primary",
          py: 1.5,
        },
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell>{translate("pos.subcategories.columns.name_en")}</TableCell>
          <TableCell>{translate("pos.subcategories.columns.name_ar")}</TableCell>
          <TableCell>{translate("pos.subcategories.columns.categories")}</TableCell>
          <TableCell align="center">{translate("pos.subcategories.columns.status")}</TableCell>
          <TableCell align="center">{translate("pos.subcategories.columns.actions")}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {grouped.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center">
              <Typography sx={{ py: 4, color: "text.secondary", fontWeight: 500 }}>
                {translate("ra.page.empty", {
                  name: translate("resources.subcategories.name", { smart_count: 2, _: "فئات فرعية" }),
                  _: "لا توجد فئات فرعية حتى الآن",
                })}
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          grouped.map((g) => (
          <TableRow key={g.en_name} sx={{ "&:hover": { backgroundColor: "rgba(37, 99, 235, 0.02)" } }}>
            <TableCell sx={{ fontWeight: 600 }}>
              {g.en_name}
              {g.ids.length > 1 && (
                <Chip
                  label={`×${g.ids.length}`}
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: "0.7rem", fontWeight: 700, borderRadius: "6px" }}
                />
              )}
            </TableCell>
            <TableCell sx={{ color: "text.secondary" }}>{g.ar_name}</TableCell>
            <TableCell>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {g.categoryIds.map(cid => (
                  <Chip
                    key={cid}
                    label={catMap.get(cid) || cid}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderRadius: "6px",
                      fontWeight: 500,
                      backgroundColor: "rgba(37, 99, 235, 0.06)",
                      color: "#2563EB",
                      borderColor: "rgba(37, 99, 235, 0.2)",
                    }}
                  />
                ))}
              </Box>
            </TableCell>
            <TableCell align="center">
              {g.allActive ? (
                <Chip
                  label={translate("pos.subcategories.status.active")}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: "rgba(22, 163, 74, 0.12)",
                    color: "#16A34A",
                  }}
                />
              ) : g.someActive ? (
                <Chip
                  label={translate("pos.subcategories.status.mixed")}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: "rgba(217, 119, 6, 0.12)",
                    color: "#D97706",
                  }}
                />
              ) : (
                <Chip
                  label={translate("pos.subcategories.status.inactive")}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: "rgba(220, 38, 38, 0.12)",
                    color: "#DC2626",
                  }}
                />
              )}
            </TableCell>
            <TableCell align="center">
              <RecordContextProvider value={{ id: g.ids[0] }}>
                <EditButton />
                <GroupDeleteButton ids={g.ids} allActive={g.allActive} someActive={g.someActive} />
              </RecordContextProvider>
            </TableCell>
          </TableRow>
        )))}
      </TableBody>
    </Table>
  );
};

const SubcategoryPagination = () => <Pagination rowsPerPageOptions={[10, 25, 50]} />;

const SubcategoryList = () => {
  const [mode, setMode] = useViewMode(RESOURCE);
  return (
    <List
      sort={{ field: "en_name", order: "ASC" }}
      perPage={500}
      pagination={mode === "card" ? <SubcategoryPagination /> : false}
      component={mode === "card" ? "div" : undefined}
      title={<SubcategoriesTitle />}
      actions={<ListActions mode={mode} onModeChange={setMode} />}
    >
      {mode === "card" ? <SubcategoryGrid /> : <GroupedTable />}
    </List>
  );
};

export default SubcategoryList;
