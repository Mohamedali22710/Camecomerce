import * as React from 'react';
import {
    List,
    Datagrid,
    TextField,
    DateField,
    EditButton,
    useDefaultTitle,
    useListContext,
    SearchInput,
    SelectInput,
    FunctionField,
} from 'react-admin';
import { Box, Chip, Typography } from '@mui/material';

const OrdersTitle = () => {
    const title = useDefaultTitle();
    const { defaultTitle } = useListContext();
    return (
        <>
            <title>{`${title} - ${defaultTitle}`}</title>
            <span>{defaultTitle}</span>
        </>
    );
};

const ORDER_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(217, 119, 6, 0.12)', color: '#D97706', label: 'Pending' },
    processing: { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', label: 'Processing' },
    shipped: { bg: 'rgba(27, 43, 73, 0.15)', color: '#1B2B49', label: 'Shipped' },
    delivered: { bg: 'rgba(22, 163, 74, 0.12)', color: '#16A34A', label: 'Delivered' },
    cancelled: { bg: 'rgba(220, 38, 38, 0.12)', color: '#DC2626', label: 'Cancelled' },
};

const PAYMENT_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748B', label: 'Pending' },
    paid: { bg: 'rgba(22, 163, 74, 0.12)', color: '#16A34A', label: 'Paid' },
    failed: { bg: 'rgba(220, 38, 38, 0.12)', color: '#DC2626', label: 'Failed' },
};

const ordersFilters = [
    <SearchInput source="q" alwaysOn />,
    <SelectInput
        source="orderStatus"
        choices={[
            { id: 'pending', name: 'Pending' },
            { id: 'processing', name: 'Processing' },
            { id: 'shipped', name: 'Shipped' },
            { id: 'delivered', name: 'Delivered' },
            { id: 'cancelled', name: 'Cancelled' },
        ]}
    />,
    <SelectInput
        source="paymentStatus"
        choices={[
            { id: 'pending', name: 'Pending' },
            { id: 'paid', name: 'Paid' },
            { id: 'failed', name: 'Failed' },
        ]}
    />,
];

const OrderList = () => (
    <List
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={25}
        filters={ordersFilters}
        title={<OrdersTitle />}
    >
        <Datagrid
            rowClick="edit"
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
                source="id"
                label="Order ID"
                render={record => (
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main' }}>
                        #{String(record.id).slice(-8)}
                    </Typography>
                )}
            />
            <DateField source="createdAt" showTime sx={{ color: 'text.secondary', fontSize: '0.875rem' }} />
            <FunctionField
                label="Items"
                render={record => {
                    try {
                        const items = typeof record.items === 'string' ? JSON.parse(record.items) : record.items;
                        const count = Array.isArray(items) ? items.length : 0;
                        return (
                            <Chip
                                label={`${count} ${count === 1 ? 'item' : 'items'}`}
                                size="small"
                                sx={{ borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                            />
                        );
                    } catch {
                        return '0';
                    }
                }}
            />
            <FunctionField
                source="totalAmount"
                label="Total"
                render={record => (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {Number(record.totalAmount || 0).toLocaleString()} {record.currency || 'EGP'}
                    </Typography>
                )}
            />
            <FunctionField
                source="paymentMethod"
                label="Payment Method"
                render={record => {
                    const isCard = record.paymentMethod === 'card';
                    return (
                        <Chip
                            label={isCard ? 'CARD' : 'COD'}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                borderRadius: '6px',
                                backgroundColor: isCard ? 'rgba(37, 99, 235, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                color: isCard ? '#2563EB' : '#475569',
                            }}
                        />
                    );
                }}
            />
            <FunctionField
                source="paymentStatus"
                label="Payment"
                render={record => {
                    const status = record.paymentStatus || 'pending';
                    const cfg = PAYMENT_STATUS_COLORS[status] || PAYMENT_STATUS_COLORS.pending;
                    return (
                        <Chip
                            label={cfg.label}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                backgroundColor: cfg.bg,
                                color: cfg.color,
                            }}
                        />
                    );
                }}
            />
            <FunctionField
                source="orderStatus"
                label="Status"
                render={record => {
                    const status = record.orderStatus || 'pending';
                    const cfg = ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.pending;
                    return (
                        <Chip
                            label={cfg.label}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                backgroundColor: cfg.bg,
                                color: cfg.color,
                            }}
                        />
                    );
                }}
            />
            <EditButton />
        </Datagrid>
    </List>
);

export default OrderList;
