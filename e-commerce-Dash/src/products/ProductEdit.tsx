import * as React from 'react';
import {
    Edit,
    SimpleForm,
    TextInput,
    NumberInput,
    ImageInput,
    ImageField,
    BooleanInput,
    required,
    useDefaultTitle,
    useEditContext,
    useTranslate,
    useRecordContext,
} from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Box, Typography, Card, CardContent, Divider, IconButton, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VariantsEditor from './VariantsEditor';
import SubcategoryInput from './SubcategoryInput';

const ProductTitle = () => {
    const appTitle = useDefaultTitle();
    const { defaultTitle } = useEditContext();
    return (
        <>
            <title>{`${appTitle} - ${defaultTitle}`}</title>
            <span>{defaultTitle}</span>
        </>
    );
};

const parseUrls = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string' && Boolean(v));
    if (typeof val === 'string') {
        try {
            const p = JSON.parse(val);
            return Array.isArray(p) ? p.filter((v): v is string => typeof v === 'string' && Boolean(v)) : [val];
        } catch {
            return [val];
        }
    }
    return [];
};

const ProductImagesEditor = () => {
    const record = useRecordContext();
    const translate = useTranslate();
    const { setValue } = useFormContext();

    const [existingUrls, setExistingUrls] = React.useState<string[]>(() => parseUrls(record?.imageURLs));

    React.useEffect(() => {
        if (record?.imageURLs) {
            const urls = parseUrls(record.imageURLs);
            setExistingUrls(urls);
            setValue('imageURLs', urls);
        }
    }, [record?.id, record?.imageURLs, setValue]);

    const handleRemove = (indexToRemove: number) => {
        const updated = existingUrls.filter((_, idx) => idx !== indexToRemove);
        setExistingUrls(updated);
        setValue('imageURLs', updated, { shouldDirty: true, shouldTouch: true });
    };

    return (
        <Card sx={{ width: '100%', mb: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {translate("pos.products.form.product_images", { _: "صور المنتج" })}
                    </Typography>
                    {existingUrls.length > 0 && (
                        <Chip
                            size="small"
                            label={`${existingUrls.length} صور حالية`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    يمكنك حذف أي صورة حالية بالضغط على علامة (✕) الموجودة أعلى الصورة، أو إضافة صور جديدة من الأسفل.
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                {/* Existing Images Gallery */}
                {existingUrls.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
                            الصور المحفوظة حالياً في المتجر:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {existingUrls.map((url, idx) => (
                                <Box
                                    key={url + idx}
                                    sx={{
                                        position: 'relative',
                                        width: 130,
                                        height: 130,
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1.5px solid',
                                        borderColor: 'divider',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        bgcolor: '#f8fafc',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={url}
                                        alt={`Product image ${idx + 1}`}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    {/* Delete Button */}
                                    <IconButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(idx);
                                        }}
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 6,
                                            backgroundColor: 'rgba(239, 68, 68, 0.95)',
                                            color: '#fff',
                                            padding: '4px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                            transition: 'transform 0.15s ease, background-color 0.15s ease',
                                            '&:hover': {
                                                backgroundColor: '#dc2626',
                                                transform: 'scale(1.15)',
                                            },
                                        }}
                                        title="حذف هذه الصورة"
                                    >
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            insetInline: 0,
                                            bgcolor: 'rgba(15, 23, 42, 0.75)',
                                            color: '#fff',
                                            fontSize: '10px',
                                            textAlign: 'center',
                                            py: 0.2,
                                            fontWeight: 500,
                                        }}
                                    >
                                        صورة {idx + 1}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Upload New Images */}
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                        {existingUrls.length > 0 ? "إضافة صور إضافية جديدة:" : "رفع صور للمنتج:"}
                    </Typography>
                    <ImageInput
                        source="images"
                        label={translate("pos.products.form.choose_files", { _: "اختيار ملفات جديدة" })}
                        accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                        multiple
                    >
                        <ImageField source="src" />
                    </ImageInput>
                </Box>
            </CardContent>
        </Card>
    );
};

const ProductEdit = () => {
    const translate = useTranslate();
    return (
        <Edit
            title={<ProductTitle />}
            transform={(data: any) => {
                const { variants, colorImages, _categoryFilter, ...rest } = data;
                const result: any = { ...rest };
                if (variants) result.variants = variants;
                else delete result.variants;
                if (colorImages) result.colorImages = colorImages;
                else delete result.colorImages;
                if (Array.isArray(data.imageURLs)) {
                    result.imageURLs = JSON.stringify(data.imageURLs);
                } else if (data.imageURLs !== undefined) {
                    result.imageURLs = data.imageURLs;
                }
                return result;
            }}
        >
            <SimpleForm sx={{ maxWidth: '64em' }}>
                <Card sx={{ width: '100%', mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            معلومات المنتج الأساسية
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            تعديل بيانات الكاميرا باللغات المختلفة (العربية، الإنجليزية، الفرنسية)
                        </Typography>
                        <Divider sx={{ mb: 2.5 }} />

                        <TextInput source="en_name" validate={required()} fullWidth label={translate("pos.products.form.name_en")} />
                        <TextInput source="ar_name" fullWidth label={translate("pos.products.form.name_ar")} />
                        <TextInput source="fr_name" fullWidth label={translate("pos.products.form.name_fr")} />

                        <TextInput source="en_description" validate={required()} fullWidth multiline rows={3} label={translate("pos.products.form.description_en")} />
                        <TextInput source="ar_description" fullWidth multiline rows={3} label={translate("pos.products.form.description_ar")} />
                        <TextInput source="fr_description" fullWidth multiline rows={3} label={translate("pos.products.form.description_fr")} />
                    </CardContent>
                </Card>

                <Card sx={{ width: '100%', mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            التسعير والتصنيف والحالة
                        </Typography>
                        <Divider sx={{ mb: 2.5 }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <NumberInput source="price" validate={required()} min={1} fullWidth />
                            <NumberInput source="discount" min={0} max={100} fullWidth label={translate("pos.products.form.discount_percent")} />
                        </Box>

                        <SubcategoryInput />

                        <Box sx={{ mt: 2 }}>
                            <BooleanInput source="isActive" label={translate("pos.products.form.active")} />
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{ width: '100%', mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                        <VariantsEditor />
                    </CardContent>
                </Card>

                <ProductImagesEditor />
            </SimpleForm>
        </Edit>
    );
};

export default ProductEdit;
