import * as React from 'react';
import { LoadingIndicator } from 'react-admin';
import { Box } from '@mui/material';
import { CustomModeToggle } from './CustomModeToggle';
import { CustomLocaleSwitcher } from './CustomLocaleSwitcher';
import { ThemeSwapper } from '../themes/ThemeSwapper';

export const AppBarToolbar = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CustomModeToggle />
        <CustomLocaleSwitcher />
        <ThemeSwapper />
        <LoadingIndicator />
    </Box>
);
