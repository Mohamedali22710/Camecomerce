import * as React from 'react';
import { Box, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useLocale } from 'react-admin';

const Logo = () => {
    const locale = useLocale();
    const [imgError, setImgError] = React.useState(false);

    const subtitle = locale === 'ar'
        ? 'لكاميرات المراقبة'
        : locale === 'fr'
        ? 'Pour les caméras de surveillance'
        : 'CCTV & Security';

    const logoSrc = `${import.meta.env.BASE_URL}logo.jpg`;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                color: 'inherit',
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    p: 0.5,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    flexShrink: 0,
                }}
            >
                {!imgError ? (
                    <img
                        src={logoSrc}
                        alt="الحارث الذكي"
                        onError={() => setImgError(true)}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #101D35 0%, #2563EB 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                        }}
                    >
                        <VideocamIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />
                    </Box>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'start' }}>
                <Typography
                    variant="subtitle1"
                    component="span"
                    sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        letterSpacing: '-0.01em',
                        color: 'text.primary',
                        fontSize: '1.05rem',
                    }}
                >
                    الحارث الذكي
                </Typography>
                <Typography
                    variant="caption"
                    component="span"
                    sx={{
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        fontWeight: 600,
                        lineHeight: 1.1,
                        mt: 0.25,
                    }}
                >
                    {subtitle}
                </Typography>
            </Box>
        </Box>
    );
};

export default Logo;
