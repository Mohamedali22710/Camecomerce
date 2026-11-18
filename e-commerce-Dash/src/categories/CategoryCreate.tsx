import * as React from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  ImageInput,
  ImageField,
  required,
  useRedirect,
  useTranslate,
} from "react-admin";
import { Card, CardContent, Typography, Divider, Box } from "@mui/material";

const CategoryCreateTitle = () => {
  const translate = useTranslate();
  const title = translate("pos.categories.create_title", { _: "إنشاء فئة جديدة" });
  return (
    <>
      <title>{`الحارث الذكي - ${title}`}</title>
      <span>{title}</span>
    </>
  );
};

const CategoryCreate = () => {
  const redirect = useRedirect();
  const translate = useTranslate();
  return (
    <Create
      redirect={false}
      title={<CategoryCreateTitle />}
      mutationOptions={{
        onSuccess: () => {
          redirect("/categories/create");
        },
      }}
    >
      <SimpleForm sx={{ maxWidth: "48em" }}>
        <Card sx={{ width: "100%", borderRadius: "14px", border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
              إضافة قسم رئيسي جديد
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              أدخل مسميات القسم باللغات الثلاث وأرفق صورة توضيحية
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
          </CardContent>
        </Card>
      </SimpleForm>
    </Create>
  );
};

export default CategoryCreate;
