import * as React from 'react';
import {
    Edit,
    useEditContext,
    useGetList,
    useUpdate,
    useUpdateMany,
    useCreate,
    useDelete,
    useNotify,
    useRedirect,
    SimpleForm,
    TextInput,
    required,
    useTranslate,
    useLocale,
} from 'react-admin';
import {
    Box,
    Button,
    CircularProgress,
    FormControlLabel,
    Checkbox,
    FormGroup,
    FormLabel,
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
                        ? 'لا توجد أقسام رئيسية متاحة حتى الآن.'
                        : 'No categories available yet.'}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 2 }}>
            <FormLabel sx={{ display: 'block', mb: 1, fontWeight: 600, color: 'text.primary' }}>
                {translate("pos.subcategories.form.categories")}
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

const SubcategoryEditForm = () => {
    const translate = useTranslate();
    const { record, isLoading: recordLoading } = useEditContext();
    const notify = useNotify();
    const redirect = useRedirect();
    const [update] = useUpdate();
    const [updateMany] = useUpdateMany();
    const [create] = useCreate();
    const [del] = useDelete();

    const [enName, setEnName] = React.useState('');
    const [arName, setArName] = React.useState('');
    const [frName, setFrName] = React.useState('');
    const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
    const [isActive, setIsActive] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    const enNameValue = record?.en_name || '';

    const { data: siblings, isPending: siblingsLoading } = useGetList('subcategories', {
        pagination: { page: 1, perPage: 100 },
        filter: { en_name: enNameValue },
    });

    React.useEffect(() => {
        if (!record) return;
        setEnName(record.en_name || '');
        setArName(record.ar_name || '');
        setFrName(record.fr_name || '');
        setIsActive(record.isActive ?? true);
    }, [record]);

    React.useEffect(() => {
        if (!siblings) return;
        setCategoryIds(siblings.map((s: any) => s.categoryId).filter(Boolean));
    }, [siblings]);

    if (recordLoading || siblingsLoading) return <CircularProgress />;

    const handleSave = async () => {
        if (!enName.trim()) return notify(translate("pos.subcategories.notification.en_name_required"), { type: 'warning' });
        if (categoryIds.length === 0) return notify(translate("pos.subcategories.notification.category_required"), { type: 'warning' });

        setSaving(true);

        const existingIds = (siblings || []).map((s: any) => ({ id: s.id, cid: s.categoryId }));

        const toCreate = categoryIds.filter((cid) => !existingIds.find((e) => e.cid === cid));
        const toDelete = existingIds.filter((e) => !categoryIds.includes(e.cid));

        try {
            await update('subcategories', { id: record.id, data: { en_name: enName, ar_name: arName || null, fr_name: frName || null, isActive } });

            const siblingIds = (siblings || []).map((s: any) => s.id).filter((id: string) => id !== record.id);
            if (siblingIds.length > 0) {
                await updateMany('subcategories', { ids: siblingIds, data: { isActive } });
            }

            for (const cid of toCreate) {
                await create('subcategories', { data: { en_name: enName, ar_name: arName || null, fr_name: frName || null, categoryId: cid, isActive } });
            }
            for (const item of toDelete) {
                await del('subcategories', { id: item.id });
            }

            notify(translate("pos.subcategories.notification.updated"), { type: 'success' });
            redirect('/subcategories');
        } catch {
            notify(translate("pos.subcategories.notification.save_failed"), { type: 'warning' });
        }
        setSaving(false);
    };

    return (
        <Card sx={{ width: '100%', borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    تعديل القسم الفرعي
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    تحديث بيانات ومسميات القسم وتحديد ارتباطه بالأقسام الرئيسية
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                <TextInput source="en_name" label={translate("pos.common.name_en")} validate={required()} fullWidth onChange={(e: any) => setEnName(e.target.value)} />
                <TextInput source="ar_name" label={translate("pos.common.name_ar")} fullWidth onChange={(e: any) => setArName(e.target.value)} />
                <TextInput source="fr_name" label={translate("pos.common.name_fr")} fullWidth onChange={(e: any) => setFrName(e.target.value)} />

                <Box sx={{ mt: 2 }}>
                    <CategoryCheckboxGroup value={categoryIds} onChange={setCategoryIds} />
                </Box>

                <Box sx={{ mt: 1 }}>
                    <FormControlLabel
                        control={<Checkbox checked={isActive} onChange={(_, c) => setIsActive(c)} />}
                        label={translate("pos.subcategories.form.active")}
                    />
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
    );
};

const SubcategoryEditTitle = () => {
    const translate = useTranslate();
    const title = translate("pos.subcategories.edit_title", { _: "تعديل الفئة الفرعية" });
    return (
        <>
            <title>{`الحارث الذكي - ${title}`}</title>
            <span>{title}</span>
        </>
    );
};

const SubcategoryEdit = () => (
    <Edit title={<SubcategoryEditTitle />}>
        <SimpleForm toolbar={false} sx={{ maxWidth: '48em' }}>
            <SubcategoryEditForm />
        </SimpleForm>
    </Edit>
);

export default SubcategoryEdit;
