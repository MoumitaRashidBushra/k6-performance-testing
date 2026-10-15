'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Box, Typography, TextField, Button, Alert, Stack, CircularProgress, Chip } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const COLOR = '#10b981';

const dashField = {
  '& .MuiOutlinedInput-root': {
    color: '#1e293b', bgcolor: '#f8fafc', borderRadius: '10px',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.15)' },
    '&:hover fieldset': { borderColor: `${COLOR}80` },
    '&.Mui-focused fieldset': { borderColor: COLOR, borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { color: '#64748b' },
  '& .MuiInputLabel-root.Mui-focused': { color: COLOR },
};

interface FieldErrors {
  merchant: string;
  amount: string;
}

export default function Payment() {
  const router = useRouter();
  const [formData, setFormData] = useState({ merchant: '', amount: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ merchant: '', amount: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trnxId, setTrnxId] = useState('');
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [serviceFee, setServiceFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/login');
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    // Clear field error on change
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const errors: FieldErrors = { merchant: '', amount: '' };
    let valid = true;

    if (!formData.merchant.trim()) {
      errors.merchant = 'Merchant phone number is required.';
      valid = false;
    }
    if (!formData.amount || formData.amount === '0') {
      errors.amount = 'Amount is required.';
      valid = false;
    } else if (Number(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0.';
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setTrnxId(''); setCurrentBalance(null);
    setPaidAmount(null); setServiceFee(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const phoneNumber = localStorage.getItem('phoneNumber');
      if (!phoneNumber) { setError('Phone number not found. Please log in again.'); return; }
      const res = await API.post('/transaction/payment', {
        from_account: phoneNumber, to_account: formData.merchant, amount: Number(formData.amount),
      });
      // 208 is a 2xx code — Axios won't throw, so we must check it explicitly.
      if (res.status === 208) {
        setError(res.data.message || 'Transaction could not be completed.');
        return;
      }
      setSuccess(res.data.message || 'Payment successful!');
      setTrnxId(res.data.trnxId || '');
      if (typeof res.data.currentBalance === 'number') setCurrentBalance(res.data.currentBalance);
      setPaidAmount(Number(formData.amount));
      if (typeof res.data.fee === 'number') setServiceFee(res.data.fee);
      setFormData({ merchant: '', amount: '' });
      setFieldErrors({ merchant: '', amount: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process payment');
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: `${COLOR}18`, border: `1px solid ${COLOR}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR, flexShrink: 0 }}>
            <PaymentsIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#1e293b', letterSpacing: '-0.3px' }}>
              Make Payment
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: 14 }}>
              Pay a merchant directly from your wallet
            </Typography>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 520 }}>
          <Box sx={{ bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '18px', p: 3.5, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  required
                  label="Merchant Phone Number"
                  name="merchant"
                  value={formData.merchant}
                  onChange={handleChange}
                  placeholder="Enter merchant's phone number"
                  error={!!fieldErrors.merchant}
                  helperText={fieldErrors.merchant || ''}
                  sx={dashField}
                />
                <TextField
                  fullWidth
                  required
                  label="Amount (BDT)"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange}
                  inputProps={{ min: 1, step: 0.01 }}
                  placeholder="Enter amount in BDT"
                  error={!!fieldErrors.amount}
                  helperText={fieldErrors.amount || ''}
                  sx={dashField}
                />

                {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}

                <Button type="submit" fullWidth variant="contained" disabled={loading}
                  sx={{ height: 50, fontSize: 15, fontWeight: 700, textTransform: 'none', borderRadius: '12px', background: `linear-gradient(135deg, ${COLOR}, #059669)`, boxShadow: `0 0 24px ${COLOR}40`, '&:hover': { background: `linear-gradient(135deg, #34d399, ${COLOR})` }, '&:disabled': { background: 'rgba(16,185,129,0.3)', color: 'rgba(255,255,255,0.4)' } }}>
                  {loading ? <><CircularProgress size={16} sx={{ color: '#fff', mr: 1 }} />Processing…</> : 'Make Payment →'}
                </Button>
              </Stack>
            </Box>
          </Box>

          {success && (
            <Box sx={{ mt: 3, bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px', p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22 }} />
                <Typography sx={{ fontWeight: 700, color: '#059669', fontSize: 15 }}>{success}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {trnxId && (
                  <Box>
                    <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction ID</Typography>
                    <Chip label={trnxId} size="small" sx={{ mt: 0.5, bgcolor: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700, fontSize: 12 }} />
                  </Box>
                )}
                {paidAmount !== null && (
                  <Box>
                    <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: 18, mt: 0.5 }}>৳ {paidAmount.toFixed(2)}</Typography>
                  </Box>
                )}
                {serviceFee !== null && (
                  <Box>
                    <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service Fee</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: 18, mt: 0.5 }}>৳ {serviceFee.toFixed(2)}</Typography>
                  </Box>
                )}
                {currentBalance !== null && (
                  <Box>
                    <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remaining Balance</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: 18, mt: 0.5 }}>৳ {currentBalance.toFixed(2)}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}
