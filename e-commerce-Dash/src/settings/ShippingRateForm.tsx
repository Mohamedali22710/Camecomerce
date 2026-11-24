import React from 'react';
import { useTranslate } from 'react-admin';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Alert,
  Button,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

import CurrentRateCard from './CurrentRateCard';

interface ShippingRateFormProps {
  shippingCost: number | string;
  setShippingCost: (val: number | string) => void;
  currentCost: number | null;
  currency: string;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ShippingRateForm: React.FC<ShippingRateFormProps> = ({
  shippingCost,
  setShippingCost,
  currentCost,
  currency,
  saving,
  onSubmit,
}) => {
  const translate = useTranslate();

  return (
    <form onSubmit={onSubmit}>
      <Stack spacing={3}>
        {/* Current Active Rate Badge */}
        <CurrentRateCard currentCost={currentCost} currency={currency} />

        <Divider />

        {/* Input Field */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {translate('pos.shipping.input_label')}
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            placeholder="0"
            slotProps={{
              htmlInput: {
                min: 0,
                step: 'any',
              },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {currency}
                    </Typography>
                  </InputAdornment>
                ),
              },
            }}
            helperText={translate('pos.shipping.input_helper')}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
              },
            }}
          />
        </Box>

        <Alert severity="info" sx={{ borderRadius: '10px' }}>
          {translate('pos.shipping.note')}
        </Alert>

        {/* Submit Action */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
            sx={{
              borderRadius: '10px',
              px: 4,
              py: 1.2,
              fontWeight: 700,
            }}
          >
            {saving ? translate('pos.shipping.saving') : translate('pos.shipping.save_button')}
          </Button>
        </Box>
      </Stack>
    </form>
  );
};

export default ShippingRateForm;

