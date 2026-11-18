import * as React from 'react';
import {
    Box,
    Button,
    Avatar,
    Typography,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Chip,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { useGetIdentity, useLogout, useTranslate } from 'react-admin';
import { Link } from 'react-router-dom';

export const CustomUserMenu = () => {
    const { identity, isPending } = useGetIdentity();
    const logout = useLogout();
    const translate = useTranslate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleClose();
        logout();
    };

    const fullName = identity?.fullName || 'Super Admin';
    const email = identity?.email || '';
    const initial = fullName ? fullName.charAt(0).toUpperCase() : 'A';

    return (
        <>
            <Button
                onClick={handleClick}
                size="small"
                sx={{
                    height: 36,
                    px: 1.25,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                    textTransform: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1, // Reliable spacing in both LTR and RTL
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        backgroundColor: 'action.hover',
                        borderColor: 'primary.main',
                        boxShadow: 'none',
                    },
                }}
            >
                <Avatar
                    src={identity?.avatar}
                    sx={{
                        width: 24,
                        height: 24,
                        bgcolor: '#2563EB',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                    }}
                >
                    {initial}
                </Avatar>

                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.825rem',
                        color: 'text.primary',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {fullName}
                </Typography>

                <KeyboardArrowDownIcon
                    sx={{
                        fontSize: 16,
                        color: 'text.secondary',
                        transition: 'transform 0.2s',
                        transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'none',
                    }}
                />
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
                            minWidth: 200,
                            p: 0.75,
                        },
                    },
                }}
            >
                <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {fullName}
                    </Typography>
                    {email ? (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            {email}
                        </Typography>
                    ) : null}
                    <Chip
                        label="مدير النظام"
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(37, 99, 235, 0.1)',
                            color: '#2563EB',
                            borderRadius: '6px',
                        }}
                    />
                </Box>

                <Divider sx={{ my: 0.75 }} />

                <MenuItem
                    component={Link}
                    to="/profile"
                    onClick={handleClose}
                    sx={{
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        gap: 1.25,
                        py: 0.85,
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 28, color: 'text.secondary' }}>
                        <PersonOutlineIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary={translate('pos.menu.profile', { _: 'ملفي الشخصي' })} />
                </MenuItem>

                <MenuItem
                    onClick={handleLogout}
                    sx={{
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'error.main',
                        gap: 1.25,
                        py: 0.85,
                        '&:hover': {
                            backgroundColor: 'rgba(220, 38, 38, 0.08)',
                        },
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 28, color: 'error.main' }}>
                        <LogoutIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary={translate('ra.auth.logout', { _: 'تسجيل الخروج' })} />
                </MenuItem>
            </Menu>
        </>
    );
};

