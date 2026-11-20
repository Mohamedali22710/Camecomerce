import * as React from "react";
import {
  EditButton,
  List,
  RecordContextProvider,
  useDefaultTitle,
  useListContext,
  useTranslate,
  TextField,
  Datagrid,
  TopToolbar,
  CreateButton,
  SortButton,
  FunctionField,
} from "react-admin";
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import ViewToggle, { useViewMode } from "../components/ViewToggle";

const RESOURCE = "categories";

const CategoriesTitle = () => {
  const translate = useTranslate();
  const title = translate("pos.menu.categories", { _: "الفئات" });
  return (
    <>
      <title>{`الحارث الذكي - ${title}`}</title>
      <span>{title}</span>
    </>
  );
};

const ListActions = ({ mode, onModeChange }: { mode: "table" | "card"; onModeChange: (v: "table" | "card") => void }) => (
  <TopToolbar sx={{ gap: 1 }}>
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

const CategoryGrid = () => {
  const { data, error, isPending } = useListContext();
  if (isPending || error || !data) return null;
  return (
    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
      {data.map((record) => (
        <RecordContextProvider key={record.id} value={record}>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              sx={{
                borderRadius: "14px",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 2px 4px rgba(16, 29, 53, 0.04)",
                overflow: "hidden",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0 8px 18px -4px rgba(37, 99, 235, 0.12)",
                  transform: "translateY(-3px)",
                },
              }}
            >
              <Box sx={{ position: "relative" }}>
                <CardMedia
                  image={
                    record.imageURL ||
                    "https://via.placeholder.com/300x140?text=No+Image"
                  }
                  sx={{ height: 140, backgroundSize: "cover" }}
                />
                <Chip
                  label={record.isActive ? "نشط" : "معطل"}
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    fontWeight: 600,
                    fontSize: "0.65rem",
                    backgroundColor: record.isActive ? "rgba(22, 163, 74, 0.9)" : "rgba(220, 38, 38, 0.9)",
                    color: "#FFFFFF",
                    borderRadius: "6px",
                  }}
                />
              </Box>
              <CardContent sx={{ pb: 1, textAlign: "center" }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {record.en_name}
                </Typography>
                {record.ar_name && (
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25, fontWeight: 500 }}>
                    {record.ar_name}
                  </Typography>
                )}
                {record.subcategories && record.subcategories.length > 0 && (
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center", mt: 1 }}>
                    {record.subcategories.map((s: any) => (
                      <Chip
                        key={s._id || s.id}
                        label={s.ar_name || s.en_name}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          backgroundColor: "rgba(37, 99, 235, 0.06)",
                          color: "#2563EB",
                          borderColor: "rgba(37, 99, 235, 0.2)",
                        }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <EditButton />
              </CardActions>
            </Card>
          </Grid>
        </RecordContextProvider>
      ))}
    </Grid>
  );
};

const CategoryTable = () => {
  const translate = useTranslate();
  return (
    <Datagrid
      rowClick="edit"
      sx={{
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        mt: 1,
        "& .RaDatagrid-headerCell": {
          fontWeight: 700,
          backgroundColor: "rgba(16, 29, 53, 0.03)",
          color: "text.primary",
          py: 1.5,
        },
      }}
    >
      <FunctionField
        label={translate("pos.categories.columns.image", { _: translate("pos.common.image", { _: "الصورة" }) })}
        render={(record: any) => (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "8px",
              backgroundColor: "#F7F8FA",
              border: "1px solid #E5E7EB",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {record.imageURL ? (
              <img
                src={record.imageURL}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Box sx={{ color: "text.secondary", fontSize: "0.75rem" }}>—</Box>
            )}
          </Box>
        )}
      />
      <TextField source="en_name" label={translate("pos.categories.columns.name_en")} sx={{ fontWeight: 600 }} />
      <TextField source="ar_name" label={translate("pos.categories.columns.name_ar")} />
      <FunctionField
        label={translate("resources.subcategories.name", { smart_count: 2, _: "الأقسام الفرعية" })}
        render={(record: any) => {
          const subs = record?.subcategories || [];
          if (!subs.length) {
            return <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>;
          }
          return (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", maxWidth: 280 }}>
              {subs.map((s: any) => (
                <Chip
                  key={s._id || s.id}
                  label={s.ar_name || s.en_name}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: "6px",
                    fontWeight: 500,
                    fontSize: "0.75rem",
                    backgroundColor: "rgba(37, 99, 235, 0.06)",
                    color: "#2563EB",
                    borderColor: "rgba(37, 99, 235, 0.2)",
                  }}
                />
              ))}
            </Box>
          );
        }}
      />
      <FunctionField
        source="isActive"
        label={translate("pos.categories.columns.active")}
        render={(record: any) => (
          <Chip
            label={record.isActive ? "نشط" : "معطل"}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              borderRadius: "6px",
              backgroundColor: record.isActive ? "rgba(22, 163, 74, 0.12)" : "rgba(220, 38, 38, 0.12)",
              color: record.isActive ? "#16A34A" : "#DC2626",
            }}
          />
        )}
      />
      <EditButton />
    </Datagrid>
  );
};

const CategoryList = () => {
  const [mode, setMode] = useViewMode(RESOURCE);
  return (
    <List
      sort={{ field: "createdAt", order: "DESC" }}
      perPage={20}
      pagination={false}
      component="div"
      actions={<ListActions mode={mode} onModeChange={setMode} />}
      title={<CategoriesTitle />}
    >
      {mode === "card" ? <CategoryGrid /> : <CategoryTable />}
    </List>
  );
};

export default CategoryList;
