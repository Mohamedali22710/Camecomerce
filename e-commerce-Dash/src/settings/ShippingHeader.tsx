import React from 'react';
import { useTranslate, Title } from 'react-admin';
import { Box, Typography } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';

export const ShippingHeader = () => {
  const translate = useTranslate();

  return (
    <>
      <Title title={translate('pos.shipping.title')} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '12px',
            backgroundColor: 'primary.light',
            color: 'primary.main',
          }}
        >
          <LocalShippingOutlinedIcon sx={{ fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {translate('pos.shipping.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {translate('pos.shipping.subtitle')}
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default ShippingHeader;

