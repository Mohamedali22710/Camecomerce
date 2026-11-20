import * as React from 'react';
import {
    Create,
    SimpleForm,
    TextInput,
    NumberInput,
    ImageInput,
    ImageField,
    required,
    useTranslate,
} from 'react-admin';
import { Box, Typography, Card, CardContent, Divider } from '@mui/material';
import VariantsEditor from './VariantsEditor';
import SubcategoryInput from './SubcategoryInput';

const ProductCreate = () => {
    const translate = useTranslate();
    return (
        <Create
            transform={(data: any) => {
                const { variants, colorImages, _categoryFilter, ...rest } = data;
                const result: any = { ...rest };
                if (variants) result.variants = variants;
                else delete result.variants;
                if (colorImages) result.colorImages = colorImages;
                else delete result.colorImages;
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
                            بيانات كاميرا المراقبة باللغتين العربية والإنجليزية
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
                            التسعير والتصنيف
                        </Typography>
                        <Divider sx={{ mb: 2.5 }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <NumberInput source="price" validate={required()} min={1} fullWidth />
                            <NumberInput source="discount" min={0} max={100} fullWidth label={translate("pos.products.form.discount_percent")} />
                        </Box>

                        <SubcategoryInput />
                    </CardContent>
                </Card>

                <Card sx={{ width: '100%', mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                        <VariantsEditor />
                    </CardContent>
                </Card>

                <Card sx={{ width: '100%', mb: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            {translate("pos.products.form.product_images")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {translate("pos.products.form.upload_images_help")}
                        </Typography>
                        <Divider sx={{ mb: 2.5 }} />

                        <ImageInput
                            source="images"
                            label={translate("pos.products.form.choose_files")}
                            accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                            multiple
                        >
                            <ImageField source="src" />
                        </ImageInput>
                    </CardContent>
                </Card>
            </SimpleForm>
        </Create>
    );
};

export default ProductCreate;
