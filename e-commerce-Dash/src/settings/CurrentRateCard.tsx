import React from 'react';
import { useTranslate } from 'react-admin';
import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface CurrentRateCardProps {
  currentCost: number | null;
  currency: string;
}

export const CurrentRateCard: React.FC<CurrentRateCardProps> = ({ currentCost, currency }) => {
  const translate = useTranslate();

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: '12px',
        backgroundColor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CheckCircleOutlineIcon color="primary" />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {translate('pos.shipping.current_rate')}:
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
        {currentCost === 0 ? '0 (مجاني / Free)' : `${currentCost} ${currency}`}
      </Typography>
    </Box>
  );
};

export default CurrentRateCard;

