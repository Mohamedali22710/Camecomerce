import * as React from 'react';
import { AppBar, TitlePortal } from 'react-admin';
import { Box, useMediaQuery, Theme } from '@mui/material';

import Logo from './Logo';
import { AppBarToolbar } from './AppBarToolbar';
import { CustomUserMenu } from './CustomUserMenu';

const CustomAppBar = () => {
    const isLargeEnough = useMediaQuery<Theme>(theme =>
        theme.breakpoints.up('sm')
    );
    return (
        <AppBar
            color="inherit"
            elevation={0}
            toolbar={<AppBarToolbar />}
            userMenu={<CustomUserMenu />}
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: theme =>
                    (theme.vars || theme).palette.background.paper,
                color: theme =>
                    (theme.vars || theme).palette.text.primary,
                '& .RaAppBar-toolbar': {
                    paddingInline: 2,
                    minHeight: 56,
                    gap: 1.5,
                },
            }}
        >
            <TitlePortal />
            {isLargeEnough && <Logo />}
            {isLargeEnough && <Box component="span" sx={{ flex: 1 }} />}
        </AppBar>
    );
};

export default CustomAppBar;
