import * as React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useTheme, useTranslate } from 'react-admin';

export const CustomModeToggle = () => {
    const [theme, setTheme] = useTheme();
    const translate = useTranslate();
    const isDark = theme === 'dark';

    const handleToggle = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    const tooltip = isDark
        ? translate('pos.theme.light', { _: 'الوضع الفاتح' })
        : translate('pos.theme.dark', { _: 'الوضع الداكن' });

    return (
        <Tooltip title={tooltip} enterDelay={300}>
            <IconButton
                onClick={handleToggle}
                aria-label={tooltip}
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        backgroundColor: 'action.hover',
                        borderColor: 'primary.main',
                    },
                }}
            >
                {isDark ? (
                    <LightModeOutlinedIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
                ) : (
                    <DarkModeOutlinedIcon sx={{ fontSize: 18, color: 'text.primary' }} />
                )}
            </IconButton>
        </Tooltip>
    );
};

