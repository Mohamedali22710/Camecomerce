import * as React from "react";
import {
  Show,
  SimpleShowLayout,
  TextField,
  BooleanField,
  FunctionField,
  useDefaultTitle,
  useShowContext,
  useRecordContext,
  useTranslate,
} from "react-admin";
import { Box, Chip, Typography } from "@mui/material";

const CategoryShowTitle = () => {
  const title = useDefaultTitle();
  const { record } = useShowContext();
  const displayName = record?.en_name || "";
  return (
    <>
      <title>{`${title} - ${displayName}`}</title>
      <span>{displayName}</span>
    </>
  );
};

const CategoryImageField = ({ source }: { source: string }) => {
  const record = useRecordContext();
  const url = record?.[source];
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Category"
      style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }}
    />
  );
};

const CategoryShow = () => {
  const translate = useTranslate();
  return (
    <Show title={<CategoryShowTitle />}>
      <SimpleShowLayout>
        <TextField source="en_name" label={translate("pos.categories.columns.name_en")} />
        <CategoryImageField source="imageURL" />
        <TextField source="ar_name" label={translate("pos.categories.columns.name_ar")} />
        <TextField source="fr_name" label={translate("pos.categories.columns.name_fr")} />
        <BooleanField source="isActive" label={translate("pos.categories.columns.active")} />
        <FunctionField
          label={translate("resources.subcategories.name", { smart_count: 2, _: "الأقسام الفرعية" })}
          render={(record: any) => {
            const subs = record?.subcategories || [];
            if (!subs.length) {
              return <Typography variant="caption" sx={{ color: "text.disabled" }}>—</Typography>;
            }
            return (
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
                {subs.map((s: any) => (
                  <Chip
                    key={s._id || s.id}
                    label={`${s.ar_name || s.en_name} ${s.en_name && s.ar_name ? `(${s.en_name})` : ""}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ borderRadius: "6px", fontWeight: 600 }}
                  />
                ))}
              </Box>
            );
          }}
        />
      </SimpleShowLayout>
    </Show>
  );
};

export default CategoryShow;
