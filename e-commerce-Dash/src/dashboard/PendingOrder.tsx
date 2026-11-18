import * as React from 'react';
import {
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Box,
    ListItemButton,
    Chip,
    Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';

interface Props {
    order: any;
}

export const PendingOrder = (props: Props) => {
    const { order } = props;

    let itemsCount = 0;
    try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        itemsCount = Array.isArray(items) ? items.length : 0;
    } catch {}

    const formattedDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';

    return (
        <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
                component={Link}
                to={`/orders/${order.id}`}
                sx={{
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                    px: 2,
                    py: 1.25,
                    '&:hover': {
                        backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    },
                }}
            >
                <ListItemAvatar sx={{ minWidth: 46 }}>
                    <Avatar
                        sx={{
                            width: 38,
                            height: 38,
                            backgroundColor: 'rgba(217, 119, 6, 0.12)',
                            color: '#D97706',
                        }}
                    >
                        <ShoppingBagOutlinedIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                #{String(order.id).slice(-6)}
                            </Typography>
                            <Chip
                                label={order.orderStatus || 'pending'}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                                    color: '#D97706',
                                    borderRadius: '6px',
                                }}
                            />
                        </Box>
                    }
                    secondary={
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {formattedDate} • {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </Typography>
                    }
                />
                <Box
                    sx={{
                        textAlign: 'right',
                        marginInlineStart: 'auto',
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                        }}
                    >
                        {order.totalAmount?.toLocaleString?.() || order.totalAmount}
                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                            {order.currency || 'EGP'}
                        </Typography>
                    </Typography>
                </Box>
            </ListItemButton>
        </ListItem>
    );
};
