import * as React from 'react';
import {
    Edit,
    SimpleForm,
    SelectInput,
    useRecordContext,
    useDefaultTitle,
    useEditContext,
} from 'react-admin';
import { Card, CardContent, Box, Typography, Divider, Chip } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';

const OrderTitle = () => {
    const appTitle = useDefaultTitle();
    const { defaultTitle } = useEditContext();
    return (
        <>
            <title>{`${appTitle} - ${defaultTitle}`}</title>
            <span>{defaultTitle}</span>
        </>
    );
};

const OrderDetails = () => {
    const record = useRecordContext();
    if (!record) return null;

    let items: any[] = [];
    try {
        items = typeof record.items === 'string' ? JSON.parse(record.items) : record.items || [];
    } catch {}

    let address: any = {};
    try {
        address = typeof record.shippingAddress === 'string' ? JSON.parse(record.shippingAddress) : record.shippingAddress || {};
    } catch {}

    const formattedDate = record.createdAt
        ? new Date(record.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : 'N/A';

    return (
        <Box sx={{ width: '100%', maxWidth: '56em' }}>
            {/* Order Summary Card */}
            <Card sx={{ mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(16, 29, 53, 0.04)' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                        <ReceiptLongOutlinedIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            ملخص الطلب | Order #{String(record.id).slice(-8)}
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2.5 }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                                تاريخ الطلب
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                                {formattedDate}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                                طريقة الدفع
                            </Typography>
                            <Chip
                                label={record.paymentMethod === 'card' ? 'بطاقة إلكترونية (Card)' : 'الدفع عند الاستلام (COD)'}
                                size="small"
                                sx={{
                                    mt: 0.5,
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    backgroundColor: record.paymentMethod === 'card' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                    color: record.paymentMethod === 'card' ? '#2563EB' : '#475569',
                                }}
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                                إجمالي المبلغ
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.25 }}>
                                {Number(record.totalAmount || 0).toLocaleString()} {record.currency || 'EGP'}
                            </Typography>
                            {record.shippingCost > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    (شامل مصاريف الشحن: {record.shippingCost} {record.currency || 'EGP'})
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Shipping Address Card */}
            <Card sx={{ mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(16, 29, 53, 0.04)' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                        <LocalShippingOutlinedIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            عنوان الشحن والتوصيل
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2.5 }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                                اسم العميل المستلم
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                                {address.fullName || '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                                رقم الهاتف
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, direction: 'ltr', textAlign: 'start' }}>
                                {address.phone || '—'}
                            </Typography>
                        </Box>
                        <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                                العنوان التفصيلي
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {[address.street, address.city, address.state, address.zipCode, address.country]
                                    .filter(Boolean)
                                    .join('، ') || '—'}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Items List Card */}
            <Card sx={{ mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(16, 29, 53, 0.04)' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <ShoppingBagOutlinedIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                المنتجات المطلوبة
                            </Typography>
                        </Box>
                        <Chip label={`${items.length} منتجات`} size="small" sx={{ fontWeight: 600, borderRadius: '6px' }} />
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {items.map((item: any, idx: number) => (
                        <Box
                            key={idx}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 1.75,
                                borderBottom: idx < items.length - 1 ? '1px solid #E5E7EB' : 'none',
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {item.ar_name || item.en_name || 'منتج'}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                                    {item.color && (
                                        <Chip label={`لون: ${item.color}`} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                                    )}
                                    {item.size && (
                                        <Chip label={`مقاس: ${item.size?.toUpperCase()}`} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                                    )}
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        الكمية: {item.quantity}
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {Number(item.price * item.quantity || 0).toLocaleString()} {record.currency || 'EGP'}
                            </Typography>
                        </Box>
                    ))}
                </CardContent>
            </Card>
        </Box>
    );
};

const OrderEdit = () => (
    <Edit title={<OrderTitle />}>
        <SimpleForm sx={{ maxWidth: '56em' }}>
            <OrderDetails />

            <Card sx={{ width: '100%', mb: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                        تحديث حالة الطلب والدفع
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        تغيير مسار معالجة الطلب وتأكيد حالة الاستلام
                    </Typography>
                    <Divider sx={{ mb: 2.5 }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <SelectInput
                            source="orderStatus"
                            label="حالة الطلب (Order Status)"
                            choices={[
                                { id: 'pending', name: 'Pending (قيد الانتظار)' },
                                { id: 'processing', name: 'Processing (قيد التجهيز)' },
                                { id: 'shipped', name: 'Shipped (تم الشحن)' },
                                { id: 'delivered', name: 'Delivered (تم التوصيل)' },
                                { id: 'cancelled', name: 'Cancelled (ملغي)' },
                            ]}
                            fullWidth
                        />
                        <SelectInput
                            source="paymentStatus"
                            label="حالة الدفع (Payment Status)"
                            choices={[
                                { id: 'pending', name: 'Pending (معلق)' },
                                { id: 'paid', name: 'Paid (تم الدفع)' },
                                { id: 'failed', name: 'Failed (فشل)' },
                            ]}
                            fullWidth
                        />
                    </Box>
                </CardContent>
            </Card>
        </SimpleForm>
    </Edit>
);

export default OrderEdit;
