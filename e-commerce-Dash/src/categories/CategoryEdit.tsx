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
import { useFormContext } from "react-hook-form";
import { Card, CardContent, Typography, Divider, Box, Chip, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

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

const CategoryFormFields = () => {
  const record = useRecordContext();
  const translate = useTranslate();
  const { setValue } = useFormContext();

  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(() => record?.imageURL || null);
  const [markedForDelete, setMarkedForDelete] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (record?.imageURL) {
      setCurrentImageUrl(record.imageURL);
      setMarkedForDelete(false);
    }
  }, [record?.id, record?.imageURL]);

  const handleDeleteImage = () => {
    setMarkedForDelete(true);
    setCurrentImageUrl(null);
    setValue("imageURL", "", { shouldDirty: true, shouldTouch: true });
    setValue("image", null, { shouldDirty: true, shouldTouch: true });
  };

  return (
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

        {currentImageUrl && !markedForDelete && (
          <Box sx={{ mt: 2.5, mb: 1, p: 2, bgcolor: "rgba(16, 29, 53, 0.02)", borderRadius: "12px", border: "1px dashed", borderColor: "divider", display: "inline-flex", flexDirection: "column" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 1 }}>
              الصورة الحالية للقسم:
            </Typography>
            <Box
              sx={{
                position: "relative",
                width: 180,
                height: 120,
                borderRadius: "10px",
                overflow: "hidden",
                border: "1.5px solid",
                borderColor: "divider",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                bgcolor: "#f8fafc",
              }}
            >
              <Box
                component="img"
                src={currentImageUrl}
                alt={record?.ar_name || record?.en_name}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <IconButton
                onClick={handleDeleteImage}
                size="small"
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  backgroundColor: "rgba(239, 68, 68, 0.95)",
                  color: "#fff",
                  padding: "4px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    backgroundColor: "#dc2626",
                    transform: "scale(1.15)",
                  },
                }}
                title="حذف هذه الصورة"
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {markedForDelete && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: "rgba(239, 68, 68, 0.08)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
              تم تحديد الصورة للحذف. سيتم حذفها نهائياً عند الضغط على "حفظ"، أو يمكنك اختيار صورة جديدة بالأسفل.
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <ImageInput
            source="image"
            label={currentImageUrl ? "تغيير صورة القسم (اختياري)" : translate("pos.categories.form.image")}
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
  );
};

const CategoryEdit = () => {
  return (
    <Edit
      title={<CategoryTitle />}
      transform={(data: any) => {
        const result = { ...data };
        if (result.imageURL === undefined && result.image === null) {
          result.imageURL = "";
        }
        return result;
      }}
    >
      <SimpleForm sx={{ maxWidth: "48em" }}>
        <CategoryFormFields />
        <RelatedSubcategories />
      </SimpleForm>
    </Edit>
  );
};

export default CategoryEdit;
