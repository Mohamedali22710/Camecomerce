import * as React from 'react';
import {
    Create,
    SimpleForm,
    TextInput,
    required,
    useRedirect,
    useNotify,
    useCreate,
    useGetList,
    useTranslate,
    useLocale,
} from 'react-admin';
import {
    FormControlLabel,
    Checkbox,
    FormGroup,
    FormLabel,
    Box,
    Button,
    CircularProgress,
    Card,
    CardContent,
    Typography,
    Divider,
} from '@mui/material';

const CategoryCheckboxGroup = ({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) => {
    const translate = useTranslate();
    const locale = useLocale();
    const { data, isPending } = useGetList('categories', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'createdAt', order: 'DESC' },
    });
    if (isPending) return <CircularProgress size={20} />;

    const categories = data || [];

    if (categories.length === 0) {
        return (
            <Box sx={{ mb: 2, p: 2, borderRadius: '8px', bgcolor: 'warning.light', color: 'warning.dark' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {locale === 'ar'
                        ? 'لا توجد أقسام رئيسية متاحة حتى الآن. يرجى إضافة قسم رئيسي أولاً.'
                        : 'No categories available yet. Please create a parent category first.'}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 2 }}>
            <FormLabel sx={{ display: 'block', mb: 1, fontWeight: 600, color: 'text.primary' }}>
                {translate("pos.common.category")}
            </FormLabel>
            <FormGroup row sx={{ gap: 1 }}>
                {categories.map((cat: any) => {
                    const label = locale === 'ar' ? (cat.ar_name || cat.en_name) : (cat.en_name || cat.ar_name);
                    return (
                        <FormControlLabel
                            key={cat.id}
                            control={
                                <Checkbox
                                    checked={value.includes(cat.id)}
                                    onChange={(_, checked) =>
                                        onChange(checked ? [...value, cat.id] : value.filter((id) => id !== cat.id))
                                    }
                                />
                            }
                            label={label}
                        />
                    );
                })}
            </FormGroup>
        </Box>
    );
};

const SubcategoryCreateTitle = () => {
    const translate = useTranslate();
    const title = translate("pos.subcategories.create_title", { _: "إنشاء فئة فرعية" });
    return (
        <>
            <title>{`الحارث الذكي - ${title}`}</title>
            <span>{title}</span>
        </>
    );
};

const SubcategoryCreate = () => {
    const translate = useTranslate();
    const redirect = useRedirect();
    const notify = useNotify();
    const [create] = useCreate();
    const [saving, setSaving] = React.useState(false);
    const [enName, setEnName] = React.useState('');
    const [arName, setArName] = React.useState('');
    const [categoryIds, setCategoryIds] = React.useState<string[]>([]);

    const handleSave = async () => {
        if (!enName.trim()) return notify(translate("pos.subcategories.notification.en_name_required"), { type: 'warning' });
        if (categoryIds.length === 0) return notify(translate("pos.subcategories.notification.category_required"), { type: 'warning' });

        setSaving(true);
        let successCount = 0;
        for (const cid of categoryIds) {
            try {
                await create('subcategories', {
                    data: { en_name: enName, ar_name: arName, categoryId: cid },
                });
                successCount++;
            } catch {
                notify(translate("pos.subcategories.notification.create_failed") + " " + cid, { type: 'warning' });
            }
        }
        setSaving(false);

        if (successCount > 0) {
            notify(translate("pos.subcategories.notification.created"), { type: 'success' });
            setEnName('');
            setArName('');
            setCategoryIds([]);
        }
    };

    return (
        <Create redirect={false} title={<SubcategoryCreateTitle />}>
            <SimpleForm toolbar={false} sx={{ maxWidth: '48em' }}>
                <Card sx={{ width: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            إضافة قسم فرعي جديد
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            حدد اسم القسم الفرعي والأقسام الرئيسية التابع لها
                        </Typography>
                        <Divider sx={{ mb: 2.5 }} />

                        <TextInput source="en_name" label={translate("pos.common.name_en")} validate={required()} fullWidth onChange={(e: any) => setEnName(e.target.value)} />
                        <TextInput source="ar_name" label={translate("pos.common.name_ar")} fullWidth onChange={(e: any) => setArName(e.target.value)} />

                        <Box sx={{ mt: 2 }}>
                            <CategoryCheckboxGroup value={categoryIds} onChange={setCategoryIds} />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ borderRadius: '8px', px: 3 }}>
                                {saving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                                {translate("pos.common.save")}
                            </Button>
                            <Button variant="outlined" onClick={() => redirect('/subcategories')} sx={{ borderRadius: '8px' }}>
                                {translate("pos.common.cancel")}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </SimpleForm>
        </Create>
    );
};

export default SubcategoryCreate;
