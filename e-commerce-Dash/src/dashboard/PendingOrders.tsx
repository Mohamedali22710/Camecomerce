import * as React from 'react';
import { Card, CardHeader, List, Box, Typography, Chip } from '@mui/material';
import { motion } from 'motion/react';
import { useTranslate } from 'react-admin';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

import { Order } from '../types';
import { PendingOrder } from './PendingOrder';

interface Props {
    orders?: Order[];
}

const PendingOrders = (props: Props) => {
    const { orders = [] } = props;
    const translate = useTranslate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <Card
                sx={{
                    flex: 1,
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 1px 3px 0 rgba(16, 29, 53, 0.04)',
                    overflow: 'hidden',
                }}
            >
                <CardHeader
                    title={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PendingActionsIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                    {translate('pos.dashboard.pending_orders')}
                                </Typography>
                            </Box>
                            {orders.length > 0 && (
                                <Chip
                                    label={orders.length}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        backgroundColor: 'rgba(217, 119, 6, 0.12)',
                                        color: '#D97706',
                                        borderRadius: '8px',
                                        height: 24,
                                    }}
                                />
                            )}
                        </Box>
                    }
                    sx={{ pb: 1 }}
                />
                <List dense={true} sx={{ px: 1, pb: 1 }}>
                    {orders.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                لا توجد طلبات معلقة حالياً
                            </Typography>
                        </Box>
                    ) : (
                        orders.map((record, index) => (
                            <motion.div
                                key={record.id}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.04, duration: 0.25 }}
                            >
                                <PendingOrder order={record} />
                            </motion.div>
                        ))
                    )}
                </List>
            </Card>
        </motion.div>
    );
};

export default PendingOrders;
