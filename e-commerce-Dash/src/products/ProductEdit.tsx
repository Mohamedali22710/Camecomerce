import * as React from 'react';
import {
    Edit,
    SimpleForm,
    TextInput,
    NumberInput,
    ImageInput,
    ImageField,
    BooleanInput,
    SaveButton,
    DeleteButton,
    Toolbar,
    required,
    useDefaultTitle,
    useEditContext,
    useTranslate,
    useRecordContext,
} from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Box, Typography, Card, CardContent, Divider, IconButton, Chip, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CollectionsIcon from '@mui/icons-material/Collections';
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

/** Extracts any existing image URLs from a product record. */
const extractExistingImageUrls = (record: any): string[] => {
    if (!record) return [];
    const urls: string[] = [];

    const addUrl = (val: any) => {
        if (!val) return;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed) return;
            // Handle JSON string array or JSON object
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(addUrl);
                        return;
                    }
                    if (parsed && typeof parsed === 'object') {
                        addUrl(parsed.url || parsed.src || parsed.secure_url || parsed.imageURL);
                        return;
                    }
                } catch {
                    // Treat as normal string URL
                }
            }
            if (!urls.includes(trimmed)) {
                urls.push(trimmed);
            }
            return;
        }

        if (Array.isArray(val)) {
            val.forEach(addUrl);
            return;
        }

        if (typeof val === 'object' && val !== null) {
            addUrl(val.url || val.src || val.secure_url || val.imageURL);
        }
    };

    if (record.imageURLs) addUrl(record.imageURLs);
    if (record.imageURL) addUrl(record.imageURL);
    if (record.image) addUrl(record.image);
    if (record.images) addUrl(record.images);

    return urls;
};

const ProductImagesEditor = () => {
    const record = useRecordContext();
    const translate = useTranslate();
    const { setValue } = useFormContext();

    const [existingUrls, setExistingUrls] = React.useState<string[]>(() => extractExistingImageUrls(record));

    React.useEffect(() => {
        if (record) {
            const urls = extractExistingImageUrls(record);
            setExistingUrls(urls);
            setValue('imageURLs', urls, { shouldDirty: false });
        }
    }, [record?.id, record?.imageURLs, record?.imageURL, record?.image, setValue]);

    const handleRemove = (indexToRemove: number) => {
        const updated = existingUrls.filter((_, idx) => idx !== indexToRemove);
        setExistingUrls(updated);
        setValue('imageURLs', updated, { shouldDirty: true, shouldTouch: true });
    };

    return (
        <Card sx={{ width: '100%', mb: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CollectionsIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {translate("pos.products.form.product_images", { _: "صور المنتج" })}
                        </Typography>
                    </Box>
                    {existingUrls.length > 0 && (
                        <Chip
                            size="small"
                            label={`${existingUrls.length} صور محفوظة`}
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
                {existingUrls.length > 0 ? (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
                            الصور المحفوظة حالياً في المتجر:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {existingUrls.map((url, idx) => {
                                const isPrimary = idx === 0;
                                return (
                                    <Box
                                        key={url + idx}
                                        sx={{
                                            position: 'relative',
                                            width: 140,
                                            height: 140,
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            border: '2px solid',
                                            borderColor: isPrimary ? 'primary.main' : 'divider',
                                            boxShadow: isPrimary
                                                ? '0 4px 12px rgba(37, 99, 235, 0.15)'
                                                : '0 2px 6px rgba(0,0,0,0.06)',
                                            bgcolor: '#f8fafc',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                                                transform: 'translateY(-2px)',
                                            },
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={url}
                                            alt={isPrimary ? "الصورة الأساسية" : `Product image ${idx + 1}`}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                bgcolor: '#fff',
                                            }}
                                        />

                                        {/* Primary Image Badge */}
                                        {isPrimary && (
                                            <Chip
                                                icon={<StarIcon sx={{ fontSize: '13px !important', color: '#fff !important' }} />}
                                                label="الأساسية"
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 6,
                                                    left: 6,
                                                    height: 22,
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    bgcolor: 'primary.main',
                                                    color: '#fff',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                                                    '& .MuiChip-label': { px: 0.75 },
                                                }}
                                            />
                                        )}

                                        {/* Delete Button (X) */}
                                        <Tooltip title="حذف هذه الصورة" arrow>
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
                                                    width: 26,
                                                    height: 26,
                                                    padding: 0,
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                                    transition: 'all 0.15s ease',
                                                    '&:hover': {
                                                        backgroundColor: '#dc2626',
                                                        transform: 'scale(1.15)',
                                                    },
                                                }}
                                            >
                                                <CloseIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>

                                        {/* Caption Label */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                insetInline: 0,
                                                bgcolor: isPrimary ? 'rgba(37, 99, 235, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                                                color: '#fff',
                                                fontSize: '11px',
                                                textAlign: 'center',
                                                py: 0.3,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {isPrimary ? 'الصورة الأساسية' : `صورة ${idx + 1}`}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            p: 2,
                            mb: 2.5,
                            borderRadius: '10px',
                            bgcolor: 'rgba(148, 163, 184, 0.08)',
                            border: '1px dashed',
                            borderColor: 'divider',
                            textAlign: 'center',
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            لا توجد صور محفوظة لهذا المنتج حالياً. يمكنك رفع الصورة الأساسية وصور إضافية من الأسفل.
                        </Typography>
                    </Box>
                )}

                {/* Upload New Images */}
                <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AddPhotoAlternateIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {existingUrls.length > 0 ? "إضافة صور إضافية جديدة للمنتج:" : "رفع صورة أساسية وصور للمنتج:"}
                        </Typography>
                    </Box>
                    <ImageInput
                        source="images"
                        label={translate("pos.products.form.choose_files", { _: "اختيار ملفات جديدة أو إفلاتها هنا" })}
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

const ProductEditToolbar = () => {
    const translate = useTranslate();
    return (
        <Toolbar
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'background.paper',
                borderRadius: '14px',
                border: '1px solid',
                borderColor: 'divider',
                p: { xs: 1.5, sm: 2 },
                mt: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SaveButton
                    label={translate("pos.common.save", { _: "حفظ التعديلات" })}
                    sx={{
                        borderRadius: '10px',
                        px: 3.5,
                        py: 1,
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    }}
                />
            </Box>
            <DeleteButton
                mutationMode="pessimistic"
                label={translate("pos.common.delete", { _: "حذف المنتج" })}
                confirmTitle="تأكيد حذف المنتج"
                confirmContent="هل أنت متأكد من رغبتك في حذف هذا المنتج؟ لن تتمكن من التراجع عن هذه العملية."
                sx={{
                    borderRadius: '10px',
                    px: 2.5,
                    py: 1,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    border: '1.5px solid',
                    borderColor: 'error.main',
                    color: 'error.main',
                    backgroundColor: 'rgba(239, 68, 68, 0.04)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        borderColor: 'error.dark',
                    },
                }}
            />
        </Toolbar>
    );
};

const ProductEdit = () => {
    const translate = useTranslate();
    return (
        <Edit
            title={<ProductTitle />}
            mutationMode="pessimistic"
            transform={(data: any) => {
                const {
                    _id,
                    id,
                    createdAt,
                    updatedAt,
                    currency,
                    addedByEmail,
                    __v,
                    _categoryFilter,
                    variants,
                    colorImages,
                    specifications,
                    subcategoryId,
                    imageURLs,
                    images,
                    ...rest
                } = data;
                const result: any = { ...rest };

                // Clean string values
                if (data.en_name) result.en_name = String(data.en_name).trim();
                if (data.ar_name !== undefined) result.ar_name = data.ar_name ? String(data.ar_name).trim() : null;
                if (data.en_description) result.en_description = String(data.en_description).trim();
                if (data.ar_description !== undefined) result.ar_description = data.ar_description ? String(data.ar_description).trim() : null;
                if (data.brand !== undefined) result.brand = data.brand ? String(data.brand).trim() : null;

                // Numbers and booleans
                if (data.price !== undefined && data.price !== null && data.price !== '') {
                    result.price = Number(data.price);
                }
                if (data.discount !== undefined && data.discount !== null && data.discount !== '') {
                    result.discount = Number(data.discount);
                }
                if (data.isActive !== undefined) {
                    result.isActive = Boolean(data.isActive);
                }

                // Ensure valid subcategoryId is passed
                const rawSubcat = subcategoryId ?? data.subcategoryId;
                const extractedSubcatId =
                    typeof rawSubcat === 'object' && rawSubcat !== null
                        ? (rawSubcat.id || rawSubcat._id)
                        : rawSubcat;
                if (typeof extractedSubcatId === 'string' && extractedSubcatId.trim().length > 0) {
                    result.subcategoryId = extractedSubcatId.trim();
                }

                // Handle variants: only send valid non-empty variants
                if (variants && variants !== 'null' && variants !== '[]') {
                    result.variants = typeof variants === 'string' ? variants : JSON.stringify(variants);
                }

                // Handle colorImages: only include if it actually has content
                if (colorImages && colorImages !== 'null') {
                    if (Array.isArray(colorImages) && colorImages.length > 0) {
                        result.colorImages = JSON.stringify(colorImages);
                    } else if (typeof colorImages === 'object' && Object.keys(colorImages).length > 0) {
                        result.colorImages = JSON.stringify(colorImages);
                    } else if (typeof colorImages === 'string') {
                        const trimmed = colorImages.trim();
                        if (trimmed && trimmed !== '{}' && trimmed !== '[]' && trimmed !== 'null') {
                            result.colorImages = trimmed;
                        }
                    }
                }

                // Handle specifications
                if (specifications && Array.isArray(specifications) && specifications.length > 0) {
                    result.specifications = JSON.stringify(specifications);
                }

                // Handle existing images: send stringified array of URLs
                if (Array.isArray(imageURLs)) {
                    result.imageURLs = JSON.stringify(imageURLs);
                } else if (typeof imageURLs === 'string') {
                    result.imageURLs = imageURLs;
                }

                // Only send images if there are actual new file uploads
                const hasNewFiles = Array.isArray(images)
                    ? images.some((img: any) => img instanceof File || img?.rawFile instanceof File)
                    : (images instanceof File || images?.rawFile instanceof File);

                if (hasNewFiles) {
                    result.images = images;
                }

                return result;
            }}
        >
            <SimpleForm toolbar={<ProductEditToolbar />} sx={{ maxWidth: '64em' }}>
                <Card sx={{ width: '100%', mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            معلومات المنتج الأساسية
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            تعديل بيانات الكاميرا باللغتين العربية والإنجليزية
                        </Typography>
                        <Divider sx={{ mb: 2.5 }} />

                        <TextInput source="en_name" validate={required()} fullWidth label={translate("pos.products.form.name_en")} />
                        <TextInput source="ar_name" fullWidth label={translate("pos.products.form.name_ar")} />

                        <TextInput source="en_description" validate={required()} fullWidth multiline rows={3} label={translate("pos.products.form.description_en")} />
                        <TextInput source="ar_description" fullWidth multiline rows={3} label={translate("pos.products.form.description_ar")} />
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
