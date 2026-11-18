import * as React from 'react';
import { FC, createElement, ReactNode } from 'react';
import { Card, Box, Typography, Divider } from '@mui/material';
import { motion } from 'motion/react';
import { Link, To } from 'react-router-dom';

interface Props {
    icon: FC<any>;
    to: To;
    title?: string;
    subtitle?: ReactNode;
    children?: ReactNode;
}

const CardWithIcon = ({ icon, title, subtitle, to, children }: Props) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
        <Card
            sx={{
                minHeight: 52,
                display: 'flex',
                flexDirection: 'column',
                flex: '1',
                borderRadius: '14px',
                borderInlineStart: '4px solid',
                borderColor: 'primary.main',
                boxShadow: '0 1px 4px 0 rgba(16, 29, 53, 0.06)',
                '& a': {
                    textDecoration: 'none',
                    color: 'inherit',
                },
            }}
        >
            <Link to={to}>
                <Box
                    sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '20px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        '& .icon': {
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 52,
                            height: 52,
                            borderRadius: '12px',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        },
                        '&:before': {
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            display: 'block',
                            content: `''`,
                            height: '180%',
                            aspectRatio: '1',
                            transform: 'translate(-35%, -50%)',
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            opacity: 0.04,
                            pointerEvents: 'none',
                        },
                    }}
                >
                    <Box className="icon">
                        {createElement(icon, { fontSize: 'medium', sx: { fontSize: 28 } })}
                    </Box>
                    <Box
                        sx={{
                            textAlign: 'right',
                        }}
                    >
                        <Typography
                            color="textSecondary"
                            sx={{
                                fontSize: '0.875rem',
                                fontWeight: 500,
                            }}
                        >
                            {title}
                        </Typography>
                        <Typography
                            variant="h5"
                            component="h2"
                            sx={{
                                fontWeight: 700,
                                color: 'text.primary',
                                mt: 0.5,
                            }}
                        >
                            {subtitle || ' '}
                        </Typography>
                    </Box>
                </Box>
            </Link>
            {children && <Divider />}
            {children}
        </Card>
    </motion.div>
);

export default CardWithIcon;
