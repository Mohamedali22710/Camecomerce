import * as React from 'react';
import { SelectInput, useGetList, useDataProvider, useTranslate, useLocale, required } from 'react-admin';
import { useWatch, useFormContext } from 'react-hook-form';

const SubcategoryInput = () => {
    const { setValue } = useFormContext();
    const translate = useTranslate();
    const locale = useLocale();
    const categoryId = useWatch({ name: '_categoryFilter' });
    const subcategoryId = useWatch({ name: 'subcategoryId' });

    const { data: categories } = useGetList('categories', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'createdAt', order: 'DESC' },
    });

    const { data: allSubcategories } = useGetList('subcategories', {
        pagination: { page: 1, perPage: 200 },
        sort: { field: 'createdAt', order: 'DESC' },
    });

    // Auto-detect category of the current subcategory on initial load if not set
    React.useEffect(() => {
        if (!categoryId && subcategoryId && allSubcategories) {
            const currentSub = allSubcategories.find((s: any) => s.id === subcategoryId || s._id === subcategoryId);
            if (currentSub?.categoryId) {
                setValue('_categoryFilter', currentSub.categoryId);
            }
        }
    }, [categoryId, subcategoryId, allSubcategories, setValue]);

    const handleCategoryChange = (e: any) => {
        const val = e?.target?.value;
        setValue('_categoryFilter', val);
        setValue('subcategoryId', undefined, { shouldDirty: true });
    };

    const categoryChoices = React.useMemo(
        () =>
            (categories || []).map((c: any) => ({
                id: c.id || c._id,
                name: locale === 'ar' ? (c.ar_name || c.en_name) : (c.en_name || c.ar_name),
            })),
        [categories, locale],
    );

    const catNameMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        (categories || []).forEach((c: any) => {
            map[c.id || c._id] = locale === 'ar' ? (c.ar_name || c.en_name) : (c.en_name || c.ar_name);
        });
        return map;
    }, [categories, locale]);

    const subcategoryChoices = React.useMemo(() => {
        if (!allSubcategories) return [];
        // Filter by category if selected, but always include the currently selected subcategory
        const filtered = allSubcategories.filter((s: any) => {
            const sid = s.id || s._id;
            if (subcategoryId && sid === subcategoryId) return true;
            if (categoryId) return s.categoryId === categoryId;
            return true;
        });

        return filtered.map((s: any) => {
            const subName = locale === 'ar' ? (s.ar_name || s.en_name) : (s.en_name || s.ar_name);
            const parentCatName = catNameMap[s.categoryId];
            return {
                id: s.id || s._id,
                name: parentCatName ? `${subName} (${parentCatName})` : subName,
            };
        });
    }, [allSubcategories, categoryId, subcategoryId, catNameMap, locale]);

    return (
        <>
            <SelectInput
                source="_categoryFilter"
                label={translate("pos.products.form.category")}
                choices={categoryChoices}
                onChange={handleCategoryChange}
                fullWidth
            />
            <SelectInput
                source="subcategoryId"
                label={translate("pos.products.form.subcategory")}
                choices={subcategoryChoices}
                validate={required()}
                fullWidth
            />
        </>
    );
};

export default SubcategoryInput;
