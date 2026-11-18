import { useState } from 'react';
import { useStore, useTranslate, ToggleThemeButton } from 'react-admin';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import ColorLensIcon from '@mui/icons-material/ColorLens';

import { themes, ThemeName } from './themes';

export const ThemeSwapper = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const [themeName, setThemeName] = useStore<ThemeName>('themeName', 'brand');
    const handleChange = (_: React.MouseEvent<HTMLElement>, index: number) => {
        const newTheme = themes[index];
        setThemeName(newTheme.name);
        setAnchorEl(null);
    };
    const currentTheme = themes.find(theme => theme.name === themeName);

    const translate = useTranslate();
    const toggleThemeTitle = translate('pos.action.change_theme', {
        _: 'Change Theme',
    });

    return (
        <>
            <Tooltip title={toggleThemeTitle} enterDelay={300}>
                <IconButton
                    onClick={handleClick}
                    size="small"
                    aria-label={toggleThemeTitle}
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
                    <ColorLensIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Tooltip>
            <Menu open={open} onClose={handleClose} anchorEl={anchorEl}>
                {themes.map((theme, index: number) => (
                    <MenuItem
                        onClick={event => handleChange(event, index)}
                        value={theme.name}
                        key={theme.name}
                        selected={theme.name === themeName}
                    >
                        {ucFirst(theme.name)}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

const ucFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
