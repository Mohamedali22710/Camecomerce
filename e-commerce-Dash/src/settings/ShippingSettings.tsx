import React, { useEffect, useState } from 'react';
import { useTranslate, useNotify } from 'react-admin';
import { Card, CardContent, Box, CircularProgress, Alert } from '@mui/material';

import { getAuthHeaders, fetchWithRefresh } from '../auth';
import ShippingHeader from './ShippingHeader';
import ShippingRateForm from './ShippingRateForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3007/v1';

export const ShippingSettings = () => {
  const translate = useTranslate();
  const notify = useNotify();

  const [shippingCost, setShippingCost] = useState<number | string>('');
  const [currentCost, setCurrentCost] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('SAR');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(`${API_URL}/settings/shipping`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to load shipping settings');
      }
      const json = await res.json();
      const val = json.data?.shippingCost ?? 0;
      setShippingCost(val);
      setCurrentCost(val);
      if (json.data?.currency) {
        setCurrency(json.data.currency);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(shippingCost);
    if (isNaN(num) || num < 0) {
      notify('pos.shipping.error_message', { type: 'error' });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(`${API_URL}/settings/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          shippingCost: num,
          shippingType: 'fixed',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to update shipping settings');
      }

      const json = await res.json();
      const updatedVal = json.data?.shippingCost ?? num;
      setShippingCost(updatedVal);
      setCurrentCost(updatedVal);
      notify('pos.shipping.success_message', { type: 'success' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || translate('pos.shipping.error_message'));
      notify('pos.shipping.error_message', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 2, mb: 4, maxWidth: 800 }}>
      <ShippingHeader />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Card
        sx={{
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ShippingRateForm
              shippingCost={shippingCost}
              setShippingCost={setShippingCost}
              currentCost={currentCost}
              currency={currency}
              saving={saving}
              onSubmit={handleSubmit}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ShippingSettings;
