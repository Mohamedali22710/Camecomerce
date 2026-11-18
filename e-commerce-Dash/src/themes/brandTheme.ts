import { RaThemeOptions, defaultTheme } from 'react-admin';
import { grey } from '@mui/material/colors';

export const brandTokens = {
    navy: '#101D35',
    navySoft: '#1B2B49',
    blue: '#2563EB',
    blueDark: '#1D4ED8',
    blueLight: '#3B82F6',
    orange: '#F59E0B',
    pageBg: '#F7F8FA',
    cardBg: '#FFFFFF',
    textPrimary: '#172033',
    textSecondary: '#667085',
    border: '#E5E7EB',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
};

export const brandLightTheme: RaThemeOptions = {
    palette: {
        primary: {
            main: brandTokens.blue,
            light: brandTokens.blueLight,
            dark: brandTokens.blueDark,
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: brandTokens.navy,
            light: brandTokens.navySoft,
            dark: '#0A1525',
            contrastText: '#FFFFFF',
        },
        success: {
            main: brandTokens.success,
            light: '#DCFCE7',
            contrastText: '#FFFFFF',
        },
        warning: {
            main: brandTokens.warning,
            light: '#FEF3C7',
            contrastText: '#FFFFFF',
        },
        error: {
            main: brandTokens.error,
            light: '#FEE2E2',
            contrastText: '#FFFFFF',
        },
        background: {
            default: brandTokens.pageBg,
            paper: brandTokens.cardBg,
        },
        text: {
            primary: brandTokens.textPrimary,
            secondary: brandTokens.textSecondary,
        },
        divider: brandTokens.border,
        mode: 'light',
    },
    typography: {
        fontFamily: "'IBM Plex Sans Arabic', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    shape: {
        borderRadius: 12,
    },
    sidebar: {
        width: 220,
    },
    components: {
        ...defaultTheme.components,
        RaMenuItemLink: {
            styleOverrides: {
                root: {
                    borderInlineStart: '3px solid transparent',
                    borderRadius: 8,
                    marginInline: 8,
                    marginBottom: 4,
                    paddingInline: 12,
                    transition: 'all 0.2s ease',
                    '&.RaMenuItemLink-active': {
                        borderInlineStart: `3px solid ${brandTokens.blue}`,
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: brandTokens.blue,
                        fontWeight: 600,
                        '& .MuiSvgIcon-root': {
                            color: brandTokens.blue,
                        },
                    },
                    '&:hover': {
                        backgroundColor: 'rgba(16, 29, 53, 0.05)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                elevation1: {
                    boxShadow: '0 1px 3px 0 rgba(16, 29, 53, 0.04), 0 1px 2px -1px rgba(16, 29, 53, 0.04)',
                },
                root: {
                    border: `1px solid ${brandTokens.border}`,
                    backgroundClip: 'padding-box',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#FFFFFF',
                    color: brandTokens.textPrimary,
                    borderBottom: `1px solid ${brandTokens.border}`,
                    boxShadow: 'none',
                },
                colorSecondary: {
                    backgroundColor: '#FFFFFF',
                    color: brandTokens.textPrimary,
                    borderBottom: `1px solid ${brandTokens.border}`,
                    boxShadow: 'none',
                },
            },
            defaultProps: {
                elevation: 0,
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 600,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    border: `1px solid ${brandTokens.border}`,
                    boxShadow: '0 1px 3px 0 rgba(16, 29, 53, 0.04)',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: 'rgba(37, 99, 235, 0.02)',
                    },
                    '&:last-child td': {
                        border: 0,
                    },
                },
            },
        },
        RaToolbar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#F7F8FA',
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                standardSuccess: {
                    backgroundColor: '#DCFCE7',
                    color: '#166534',
                    '& .MuiAlert-icon': {
                        color: brandTokens.success,
                    },
                },
                standardWarning: {
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    '& .MuiAlert-icon': {
                        color: brandTokens.warning,
                    },
                },
                standardError: {
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    '& .MuiAlert-icon': {
                        color: brandTokens.error,
                    },
                },
            },
        },
    },
};

export const brandDarkTheme: RaThemeOptions = {
    palette: {
        primary: {
            main: brandTokens.blueLight,
            light: '#60A5FA',
            dark: brandTokens.blue,
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: brandTokens.navySoft,
            light: '#24375A',
            dark: brandTokens.navy,
            contrastText: '#FFFFFF',
        },
        success: {
            main: brandTokens.success,
            light: '#166534',
            contrastText: '#FFFFFF',
        },
        warning: {
            main: brandTokens.warning,
            light: '#92400E',
            contrastText: '#FFFFFF',
        },
        error: {
            main: brandTokens.error,
            light: '#991B1B',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#0B1323',
            paper: '#101D35',
        },
        text: {
            primary: '#F8FAFC',
            secondary: '#94A3B8',
        },
        divider: '#1E2E4A',
        mode: 'dark',
    },
    typography: {
        fontFamily: "'IBM Plex Sans Arabic', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    shape: {
        borderRadius: 12,
    },
    sidebar: {
        width: 220,
    },
    components: {
        ...defaultTheme.components,
        RaMenuItemLink: {
            styleOverrides: {
                root: {
                    borderInlineStart: '3px solid transparent',
                    borderRadius: 8,
                    marginInline: 8,
                    marginBottom: 4,
                    paddingInline: 12,
                    color: '#94A3B8',
                    '&.RaMenuItemLink-active': {
                        borderInlineStart: `3px solid ${brandTokens.blueLight}`,
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#60A5FA',
                        fontWeight: 600,
                        '& .MuiSvgIcon-root': {
                            color: '#60A5FA',
                        },
                    },
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#F8FAFC',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    border: '1px solid #1E2E4A',
                    backgroundColor: '#101D35',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#101D35',
                    color: '#F8FAFC',
                    borderBottom: '1px solid #1E2E4A',
                    boxShadow: 'none',
                },
                colorSecondary: {
                    backgroundColor: '#101D35',
                    color: '#F8FAFC',
                    borderBottom: '1px solid #1E2E4A',
                    boxShadow: 'none',
                },
            },
            defaultProps: {
                elevation: 0,
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 600,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    border: '1px solid #1E2E4A',
                    backgroundColor: '#101D35',
                },
            },
        },
        RaToolbar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#0B1323',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: 'rgba(59, 130, 246, 0.06)',
                    },
                    '&:last-child td': {
                        border: 0,
                    },
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                standardSuccess: {
                    backgroundColor: 'rgba(22, 163, 74, 0.15)',
                    color: '#4ADE80',
                    '& .MuiAlert-icon': {
                        color: '#4ADE80',
                    },
                },
                standardWarning: {
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    color: '#FBBF24',
                    '& .MuiAlert-icon': {
                        color: '#FBBF24',
                    },
                },
                standardError: {
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                    color: '#F87171',
                    '& .MuiAlert-icon': {
                        color: '#F87171',
                    },
                },
            },
        },
    },
};

