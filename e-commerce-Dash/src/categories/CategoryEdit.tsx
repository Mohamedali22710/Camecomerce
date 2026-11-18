import * as React from "react";
import {
  Edit,
  SimpleForm,
  TextInput,
  ImageInput,
  ImageField,
  BooleanInput,
  useDefaultTitle,
  useEditContext,
  useRecordContext,
  useTranslate,
  required,
} from "react-admin";
import { Card, CardContent, Typography, Divider, Box, Chip } from "@mui/material";

const CategoryTitle = () => {
  const appTitle = useDefaultTitle();
  const { defaultTitle } = useEditContext();
  return (
    <>
      <title>{`${appTitle} - ${defaultTitle}`}</title>
      <span>{defaultTitle}</span>
    </>
  );
};

const RelatedSubcategories = () => {
  const record = useRecordContext();
  const translate = useTranslate();
  const subs = record?.subcategories || [];

  return (
    <Card sx={{ width: "100%", mt: 2.5, borderRadius: "14px", border: "1px solid", borderColor: "divider" }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
          {translate("resources.subcategories.name", { smart_count: 2, _: "الأقسام الفرعية التابعة" })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subs.length > 0
            ? `يحتوي هذا القسم على ${subs.length} أقسام فرعية`
            : "لا توجد أقسام فرعية مرتبطة بهذا القسم بعد"}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {subs.length > 0 ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {subs.map((s: any) => (
              <Chip
                key={s._id || s.id}
                label={`${s.ar_name || s.en_name} ${s.en_name && s.ar_name ? `(${s.en_name})` : ""}`}
                color="primary"
                variant="outlined"
                sx={{ borderRadius: "8px", fontWeight: 600 }}
              />
            ))}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
};

const CategoryEdit = () => {
  const translate = useTranslate();
  return (
    <Edit title={<CategoryTitle />}>
      <SimpleForm sx={{ maxWidth: "48em" }}>
        <Card sx={{ width: "100%", borderRadius: "14px", border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
              تعديل القسم الرئيسي
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              تعديل المسميات والصورة وحالة التفعيل للقسم
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <TextInput source="en_name" label={translate("pos.common.name_en")} validate={required()} fullWidth />
            <TextInput source="ar_name" label={translate("pos.common.name_ar")} fullWidth />
            <TextInput source="fr_name" label={translate("pos.common.name_fr")} fullWidth />

            <Box sx={{ mt: 2 }}>
              <ImageInput
                source="image"
                label={translate("pos.categories.form.image")}
                accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
              >
                <ImageField source="src" />
              </ImageInput>
            </Box>

            <Box sx={{ mt: 2 }}>
              <BooleanInput source="isActive" label={translate("pos.categories.form.active")} />
            </Box>
          </CardContent>
        </Card>

        <RelatedSubcategories />
      </SimpleForm>
    </Edit>
  );
};

export default CategoryEdit;
