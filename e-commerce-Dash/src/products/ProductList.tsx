import * as React from 'react';
import { Box, Chip, Typography, InputBase, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import {
    CreateButton,
    ListBase,
    Pagination,
    ReferenceInput,
    SearchInput,
    SelectInput,
    SortButton,
    Title,
    TopToolbar,
    useDefaultTitle,
    useListContext,
    Datagrid,
    TextField,
    EditButton,
    FunctionField,
    ReferenceField,
    useTranslate,
    useLocale,
} from 'react-admin';

const ProductList = () => {
    const translate = useTranslate();
    const locale = useLocale();
    return (
        <ListBase perPage={24} sort={{ field: 'createdAt', order: 'DESC' }}>
            <ProductTitle />
            <Box sx={{ pt: 2.5, pb: 0.5 }}>
                <ListActions />
            </Box>
            <Box sx={{ display: 'flex', mt: 1.5 }}>
                <Box sx={{ width: '100%' }}>
                    <Datagrid
                        rowClick="edit"
                        bulkActionButtons={false}
                        sx={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                            '& .RaDatagrid-headerCell': {
                                fontWeight: 700,
                                backgroundColor: 'rgba(16, 29, 53, 0.03)',
                                color: 'text.primary',
                                py: 1.5,
                            },
                            '& .MuiTableRow-root:hover': {
                                backgroundColor: 'rgba(37, 99, 235, 0.03)',
                            },
                        }}
                    >
                        <FunctionField
                            label={locale === 'ar' ? 'الصورة' : 'Image'}
                            render={record => {
                                let urls: string[] = [];
                                if (record.imageURLs) {
                                    try {
                                        urls = typeof record.imageURLs === 'string' ? JSON.parse(record.imageURLs) : record.imageURLs;
                                    } catch { /* ignore */ }
                                }
                                return (
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '8px',
                                            backgroundColor: '#F7F8FA',
                                            border: '1px solid #E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {urls.length > 0 ? (
                                            <img
                                                src={urls[0]}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        ) : (
                                            <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>—</Box>
                                        )}
                                    </Box>
                                );
                            }}
                        />
                        <FunctionField
                            label={locale === 'ar' ? 'الاسم' : 'Name'}
                            render={(record: any) => {
                                const name = locale === 'ar' ? (record?.ar_name || record?.en_name) : (record?.en_name || record?.ar_name);
                                return (
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {name || '—'}
                                    </Typography>
                                );
                            }}
                        />
                        <FunctionField
                            source="stock"
                            sortBy="stock"
                            label={locale === 'ar' ? 'الكمية الحالية' : 'Current Quantity'}
                            render={(record: any) => {
                                const stock = record.stock !== undefined && record.stock !== null ? Number(record.stock) : 0;
                                const isOutOfStock = stock <= 0;
                                return (
                                    <Chip
                                        label={isOutOfStock ? (locale === 'ar' ? '0 (نفدت الكمية)' : '0 (Out of Stock)') : `${stock}`}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            backgroundColor: isOutOfStock
                                                ? 'rgba(220, 38, 38, 0.12)'
                                                : stock < 10
                                                ? 'rgba(245, 158, 11, 0.12)'
                                                : 'rgba(37, 99, 235, 0.08)',
                                            color: isOutOfStock
                                                ? '#DC2626'
                                                : stock < 10
                                                ? '#D97706'
                                                : '#2563EB',
                                            borderRadius: '6px',
                                        }}
                                    />
                                );
                            }}
                        />
                        <FunctionField
                            label={locale === 'ar' ? 'السعر' : 'Price'}
                            render={record => {
                                const price = Number(record.price) || 0;
                                const discount = Number(record.discount) || 0;
                                const discounted = discount > 0 ? price - (price * discount) / 100 : price;
                                return (
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                            {discounted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {record.currency || 'SAR'}
                                        </Typography>
                                        {discount > 0 && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    textDecoration: 'line-through',
                                                    color: 'text.secondary',
                                                }}
                                            >
                                                {price.toLocaleString()} {record.currency || 'SAR'}
                                            </Typography>
                                        )}
                                    </Box>
                                );
                            }}
                        />
                        <FunctionField
                            label={locale === 'ar' ? 'الخصم' : 'Discount'}
                            render={record => {
                                const discount = Number(record.discount) || 0;
                                if (discount > 0) {
                                    return (
                                        <Chip
                                            label={`${discount}% OFF`}
                                            size="small"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                                color: '#D97706',
                                                borderRadius: '6px',
                                            }}
                                        />
                                    );
                                }
                                return <Typography variant="caption" color="text.secondary">0%</Typography>;
                            }}
                        />
                        <ReferenceField
                            source="subcategoryId"
                            reference="subcategories"
                            link="show"
                            label={locale === 'ar' ? 'الفئة الفرعية' : 'Subcategory'}
                        >
                            <FunctionField
                                render={(record: any) =>
                                    locale === 'ar'
                                        ? (record?.ar_name || record?.en_name)
                                        : (record?.en_name || record?.ar_name)
                                }
                                sx={{ color: 'primary.main', fontWeight: 500 }}
                            />
                        </ReferenceField>
                        <FunctionField
                            label={locale === 'ar' ? 'الحالة' : 'Status'}
                            render={record => (
                                <Chip
                                    label={record.isActive ? "نشط" : "معطل"}
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        backgroundColor: record.isActive ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                                        color: record.isActive ? '#16A34A' : '#DC2626',
                                        borderRadius: '6px',
                                    }}
                                />
                            )}
                        />
                        <EditButton />
                    </Datagrid>
                    <Pagination rowsPerPageOptions={[12, 24, 48, 72]} />
                </Box>
            </Box>
        </ListBase>
    );
};

const ProductTitle = () => {
    const appTitle = useDefaultTitle();
    const { defaultTitle } = useListContext();
    return (
        <>
            <title>{`${appTitle} - ${defaultTitle}`}</title>
            <Title defaultTitle={defaultTitle} />
        </>
    );
};

export const productFilters = [
    <SearchInput source="q" alwaysOn />,
    <ReferenceInput
        source="subcategoryId"
        reference="subcategories"
        sort={{ field: 'en_name', order: 'ASC' }}
    >
        <SelectInput optionText={(record: any) => record ? (record.ar_name || record.en_name) : ''} />
    </ReferenceInput>,
];

const ListActions = () => {
    const translate = useTranslate();
    const { filterValues, setFilters } = useListContext();
    const [search, setSearch] = React.useState(filterValues?.q || filterValues?.search || '');

    // Synchronize local state if filters change externally
    React.useEffect(() => {
        const external = filterValues?.q || filterValues?.search || '';
        setSearch(external);
    }, [filterValues?.q, filterValues?.search]);

    // Debounce applying search filter to prevent redundant API calls
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const currentFilter = filterValues?.q || filterValues?.search || '';
            const trimmed = search.trim();
            if (trimmed !== currentFilter) {
                const nextFilters = { ...filterValues };
                if (trimmed) {
                    nextFilters.q = trimmed;
                } else {
                    delete nextFilters.q;
                    delete nextFilters.search;
                }
                setFilters(nextFilters, null);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [search, filterValues, setFilters]);

    const handleClear = () => {
        setSearch('');
        const nextFilters = { ...filterValues };
        delete nextFilters.q;
        delete nextFilters.search;
        setFilters(nextFilters, null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const currentFilter = filterValues?.q || filterValues?.search || '';
            const trimmed = search.trim();
            if (trimmed !== currentFilter) {
                const nextFilters = { ...filterValues };
                if (trimmed) {
                    nextFilters.q = trimmed;
                } else {
                    delete nextFilters.q;
                    delete nextFilters.search;
                }
                setFilters(nextFilters, null);
            }
        }
    };

    return (
        <TopToolbar
            sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                p: '0 !important',
                minHeight: 'unset !important',
            }}
        >
            {/* Search Box on start (Right in Arabic RTL, Left in English LTR) */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.65,
                    width: { xs: '100%', sm: 300, md: 360 },
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        borderColor: 'primary.light',
                    },
                    '&:focus-within': {
                        borderColor: 'primary.main',
                        boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)',
                    },
                }}
            >
                <SearchIcon sx={{ color: 'text.secondary', marginInlineEnd: 1, fontSize: 20 }} />
                <InputBase
                    placeholder={translate('pos.products.search', { _: 'بحث عن المنتجات...' })}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    sx={{ flex: 1, fontSize: '0.875rem' }}
                    inputProps={{ 'aria-label': 'search products' }}
                />
                {search && (
                    <IconButton
                        size="small"
                        onClick={handleClear}
                        sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                )}
            </Box>

            {/* Actions: Sort & Create Button on the opposite side */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SortButton fields={['en_name', 'price', 'createdAt']} />
                <CreateButton
                    variant="contained"
                    sx={{
                        backgroundColor: '#2563EB',
                        borderRadius: '8px',
                        fontWeight: 600,
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                        '&:hover': {
                            backgroundColor: '#1D4ED8',
                        },
                    }}
                />
            </Box>
        </TopToolbar>
    );
};

export default ProductList;
