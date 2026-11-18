import * as React from 'react';
import { Box, Card, CardActions, Button, Typography } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import VideocamIcon from '@mui/icons-material/Videocam';
import { motion } from 'motion/react';
import { useTranslate } from 'react-admin';
import { Link } from 'react-router-dom';

import publishArticleImage from './welcome_illustration.svg';

const Welcome = () => {
    const translate = useTranslate();
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <Card
                sx={{
                    background: 'linear-gradient(135deg, #101D35 0%, #1B2B49 55%, #2563EB 100%)',
                    color: '#FFFFFF',
                    padding: '24px',
                    marginTop: 2,
                    marginBottom: '1.25em',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(16, 29, 53, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <Box
                        sx={{
                            flex: '1',
                        }}
                    >
                        <Typography
                            variant="h5"
                            component="h2"
                            gutterBottom
                            sx={{
                                fontWeight: 700,
                                color: '#FFFFFF',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {translate('pos.dashboard.welcome.title')}
                        </Typography>
                        <Box
                            sx={{
                                maxWidth: '42em',
                            }}
                        >
                            <Typography
                                variant="body1"
                                component="p"
                                gutterBottom
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.85)',
                                    lineHeight: 1.6,
                                }}
                            >
                                {translate('pos.dashboard.welcome.subtitle')}
                            </Typography>
                        </Box>
                        <CardActions
                            sx={{
                                padding: { xs: 0, xl: null },
                                flexWrap: { xs: 'wrap', xl: null },
                                gap: 1.5,
                                mt: 2,
                                '& a': {
                                    textDecoration: 'none',
                                },
                            }}
                        >
                            <Button
                                component={Link}
                                to="/orders"
                                variant="contained"
                                startIcon={<ShoppingCartIcon />}
                                sx={{
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    fontWeight: 600,
                                    borderRadius: '10px',
                                    px: 2.5,
                                    py: 1,
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                                    '&:hover': {
                                        backgroundColor: '#1D4ED8',
                                    },
                                }}
                            >
                                {translate('pos.dashboard.welcome.ra_button')}
                            </Button>
                            <Button
                                component={Link}
                                to="/products"
                                variant="outlined"
                                startIcon={<VideocamIcon />}
                                sx={{
                                    borderColor: 'rgba(255, 255, 255, 0.4)',
                                    color: '#FFFFFF',
                                    fontWeight: 600,
                                    borderRadius: '10px',
                                    px: 2.5,
                                    py: 1,
                                    backdropFilter: 'blur(4px)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    '&:hover': {
                                        borderColor: '#FFFFFF',
                                        backgroundColor: 'rgba(255, 255, 255, 0.16)',
                                    },
                                }}
                            >
                                {translate('pos.dashboard.welcome.demo_button')}
                            </Button>
                        </CardActions>
                    </Box>
                    <Box
                        sx={{
                            display: { xs: 'none', sm: 'none', md: 'block' },
                            width: '16em',
                            height: '9em',
                            overflow: 'hidden',
                            background: `url(${publishArticleImage}) top right / cover`,
                            marginInlineStart: 'auto',
                            opacity: 0.9,
                        }}
                    />
                </Box>
            </Card>
        </motion.div>
    );
};

export default Welcome;
