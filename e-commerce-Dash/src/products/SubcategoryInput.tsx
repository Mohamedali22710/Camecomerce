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

    const catFilter = useCategoryFilter(subcategoryId, categoryId);

    React.useEffect(() => {
        if (catFilter && !categoryId) {
            setValue('_categoryFilter', catFilter);
        }
    }, [catFilter, categoryId, setValue]);

    const prevCategoryRef = React.useRef(categoryId);
    React.useEffect(() => {
        if (prevCategoryRef.current !== undefined && prevCategoryRef.current !== categoryId) {
            setValue('subcategoryId', undefined);
        }
        prevCategoryRef.current = categoryId;
    }, [categoryId, setValue]);

    const { data: subcategories } = useGetList('subcategories', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'createdAt', order: 'DESC' },
        filter: catFilter ? { categoryId: catFilter } : undefined,
    });

    const categoryChoices = React.useMemo(
        () =>
            (categories || []).map((c: any) => ({
                id: c.id,
                name: locale === 'ar' ? (c.ar_name || c.en_name) : (c.en_name || c.ar_name),
            })),
        [categories, locale],
    );

    const catNameMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        (categories || []).forEach((c: any) => {
            map[c.id] = locale === 'ar' ? (c.ar_name || c.en_name) : (c.en_name || c.ar_name);
        });
        return map;
    }, [categories, locale]);

    const subcategoryChoices = React.useMemo(
        () =>
            (subcategories || []).map((s: any) => {
                const subName = locale === 'ar' ? (s.ar_name || s.en_name) : (s.en_name || s.ar_name);
                const parentCatName = catNameMap[s.categoryId];
                return {
                    id: s.id,
                    name: parentCatName ? `${subName} (${parentCatName})` : subName,
                };
            }),
        [subcategories, catNameMap, locale],
    );

    return (
        <>
            <SelectInput
                source="_categoryFilter"
                label={translate("pos.products.form.category")}
                choices={categoryChoices}
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

const useCategoryFilter = (subcategoryId: string | undefined, categoryId: string | undefined) => {
    const dp = useDataProvider();
    const [filter, setFilter] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        if (categoryId) {
            setFilter(undefined);
            return;
        }
        if (!subcategoryId) return;
        let cancelled = false;
        dp.getOne('subcategories', { id: subcategoryId }).then(({ data }) => {
            if (!cancelled && data?.categoryId) setFilter(data.categoryId);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [subcategoryId, categoryId, dp]);

    return categoryId || filter;
};

export default SubcategoryInput;
