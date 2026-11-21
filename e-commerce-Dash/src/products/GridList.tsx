import * as React from 'react';
import {
    useTheme,
    useMediaQuery,
    Box,
    Card,
    CardMedia,
    CardContent,
    Typography,
    Chip,
    Grid,
    Skeleton,
} from '@mui/material';
import { useCreatePath, useListContext, useLocale } from 'react-admin';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

const GridList = () => {
    const { isPending } = useListContext();
    return isPending ? <LoadingGridList /> : <LoadedGridList />;
};

const LoadingGridList = () => {
    return (
        <Grid container spacing={2} sx={{ mt: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Skeleton variant="rounded" sx={{ height: 260, borderRadius: '12px' }} />
                </Grid>
            ))}
        </Grid>
    );
};

const LoadedGridList = () => {
    const { data } = useListContext();
    const createPath = useCreatePath();
    const locale = useLocale();

    if (!data || data.length === 0) return null;

    return (
        <Grid container spacing={2} sx={{ mt: 1 }}>
            {data.map((record, index) => {
                let urls: string[] = [];
                if (record.imageURLs) {
                    try {
                        urls = typeof record.imageURLs === 'string' ? JSON.parse(record.imageURLs) : record.imageURLs;
                    } catch {}
                }
                const imageUrl = urls.length > 0 ? urls[0] : (record.thumbnail || '');
                const price = Number(record.price) || 0;
                const discount = Number(record.discount) || 0;
                const effectivePrice = discount > 0 ? price - (price * discount) / 100 : price;

                return (
                    <Grid key={record.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.25 }}
                            whileHover={{ y: -4 }}
                        >
                            <Card
                                component={Link}
                                to={createPath({
                                    resource: 'products',
                                    id: record.id,
                                    type: 'edit',
                                })}
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    textDecoration: 'none',
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    boxShadow: '0 2px 4px 0 rgba(16, 29, 53, 0.04)',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.15)',
                                    },
                                }}
                            >
                                <Box sx={{ position: 'relative', pt: '75%', bgcolor: '#F7F8FA', overflow: 'hidden' }}>
                                    {imageUrl ? (
                                        <CardMedia
                                            component="img"
                                            image={imageUrl}
                                            alt={(locale === 'ar' ? (record.ar_name || record.en_name) : (record.en_name || record.ar_name)) || ''}
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                p: 2,
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'text.secondary',
                                            }}
                                        >
                                            No Image
                                        </Box>
                                    )}

                                    {discount > 0 && (
                                        <Chip
                                            label={`${discount}% OFF`}
                                            size="small"
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                backgroundColor: '#F59E0B',
                                                color: '#FFFFFF',
                                                borderRadius: '6px',
                                            }}
                                        />
                                    )}

                                    <Chip
                                        label={record.isActive ? 'Active' : 'Inactive'}
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            fontWeight: 600,
                                            fontSize: '0.65rem',
                                            backgroundColor: record.isActive ? 'rgba(22, 163, 74, 0.9)' : 'rgba(220, 38, 38, 0.9)',
                                            color: '#FFFFFF',
                                            borderRadius: '6px',
                                        }}
                                    />
                                </Box>

                                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: 700,
                                            color: 'text.primary',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            mb: 1,
                                        }}
                                    >
                                        {locale === 'ar' ? (record.ar_name || record.en_name) : (record.en_name || record.ar_name)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                            {effectivePrice.toLocaleString()} {record.currency || 'SAR'}
                                        </Typography>
                                        {discount > 0 && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    textDecoration: 'line-through',
                                                    color: 'text.secondary',
                                                }}
                                            >
                                                {price.toLocaleString()}
                                            </Typography>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default GridList;
