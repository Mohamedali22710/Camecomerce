import * as React from 'react';
import { Box, Chip, Typography } from '@mui/material';
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
            <ListActions />
            <Box sx={{ display: 'flex', mt: 1 }}>
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
                            label={translate("pos.products.columns.image")}
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
                            label={translate("pos.products.columns.name")}
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
                            label={translate("pos.products.columns.price") || (locale === 'ar' ? 'السعر' : 'Price')}
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
                            label={translate("pos.products.columns.discount")}
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
                            label={translate("pos.products.columns.subcategory") || (locale === 'ar' ? 'الفئة الفرعية' : 'Subcategory')}
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
                            label={translate("pos.products.columns.active")}
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

const ListActions = () => (
    <TopToolbar sx={{ gap: 1 }}>
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
    </TopToolbar>
);

export default ProductList;
