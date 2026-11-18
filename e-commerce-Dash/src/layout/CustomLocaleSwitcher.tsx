import * as React from 'react';
import {
    Button,
    Menu,
    MenuItem,
    Typography,
    Box,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import { useLocale, useSetLocale } from 'react-admin';

interface LanguageOption {
    locale: string;
    name: string;
    code: string;
}

const LANGUAGES: LanguageOption[] = [
    { locale: 'ar', name: 'العربية', code: 'AR' },
    { locale: 'en', name: 'English', code: 'EN' },
    { locale: 'fr', name: 'Français', code: 'FR' },
];

export const CustomLocaleSwitcher = () => {
    const currentLocale = useLocale();
    const setLocale = useSetLocale();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const currentLang = LANGUAGES.find((l) => l.locale === currentLocale) || LANGUAGES[0];

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSelect = (newLocale: string) => {
        try {
            localStorage.setItem('ECommerce.locale', newLocale);
            localStorage.setItem('locale', newLocale);
        } catch {}
        setLocale(newLocale);
        handleClose();
    };

    return (
        <>
            <Button
                onClick={handleClick}
                size="small"
                sx={{
                    height: 36,
                    minWidth: 105,
                    px: 1.25,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                    textTransform: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.75,
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        backgroundColor: 'action.hover',
                        borderColor: 'primary.main',
                        boxShadow: 'none',
                    },
                }}
            >
                <KeyboardArrowDownIcon
                    sx={{
                        fontSize: 18,
                        color: 'text.secondary',
                        transition: 'transform 0.2s',
                        transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'none',
                    }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.825rem',
                            color: 'text.primary',
                            lineHeight: 1,
                        }}
                    >
                        {currentLang.name}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                            lineHeight: 1,
                        }}
                    >
                        {currentLang.code}
                    </Typography>
                </Box>
            </Button>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.75,
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 10px 25px -5px rgba(16, 29, 53, 0.12), 0 8px 10px -6px rgba(16, 29, 53, 0.08)',
                            minWidth: 140,
                            p: 0.5,
                        },
                    },
                }}
            >
                {LANGUAGES.map((lang) => {
                    const isSelected = lang.locale === currentLocale;
                    return (
                        <MenuItem
                            key={lang.locale}
                            selected={isSelected}
                            onClick={() => handleSelect(lang.locale)}
                            sx={{
                                borderRadius: '8px',
                                my: 0.25,
                                px: 1.5,
                                py: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1.5,
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.875rem',
                                '&.Mui-selected': {
                                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                    color: 'primary.main',
                                    '&:hover': {
                                        backgroundColor: 'rgba(37, 99, 235, 0.14)',
                                    },
                                },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{lang.name}</span>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '0.7rem',
                                        color: isSelected ? 'primary.main' : 'text.secondary',
                                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'action.hover',
                                        px: 0.75,
                                        py: 0.2,
                                        borderRadius: '4px',
                                    }}
                                >
                                    {lang.code}
                                </Typography>
                            </Box>
                            {isSelected && <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
};

