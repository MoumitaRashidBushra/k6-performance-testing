'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Stack,
  Divider,
} from '@mui/material';

export default function AdminDeposit() {
  const router = useRouter();
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trnxId, setTrnxId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTrnxId('');
    setLoading(true);

    try {
      const phoneNumber = localStorage.getItem('phoneNumber');

      if (!phoneNumber) {
        setError('Admin phone number not found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await API.post('/transaction/adminDeposit', {
        from_account: phoneNumber,
        to_account: toAccount.trim(),
        amount: Number(amount),
      });

      setSuccess(response.data.message || 'Deposit successful!');
      setTrnxId(response.data.trnxId || '');
      setToAccount('');
      setAmount('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" gutterBottom>
          Admin Deposit
        </Typography>

        <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 2, maxWidth: 560, width: '100%' }}>
          {/* Info banner */}
          <Alert severity="info" sx={{ mb: 3 }}>
            As Admin, you can only deposit to the <strong>SYSTEM</strong> account. Enter{' '}
            <code>SYSTEM</code> as the account phone number below.
          </Alert>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="SYSTEM Account Phone Number"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                required
                placeholder='Enter "SYSTEM"'
                helperText='The SYSTEM account phone number is "SYSTEM"'
              />

              <TextField
                fullWidth
                label="Amount (BDT)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                inputProps={{ min: 1, step: 0.01 }}
                placeholder="Enter amount"
                helperText="No deposit limit for Admin → SYSTEM transfers"
              />

              {error && (
                <Alert severity="error">{error}</Alert>
              )}

              {success && (
                <>
                  <Alert severity="success">{success}</Alert>
                  {trnxId && (
                    <>
                      <Divider />
                      <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Transaction ID
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {trnxId}
                        </Typography>
                      </Box>
                    </>
                  )}
                </>
              )}

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
                size="large"
              >
                {loading ? 'Processing...' : 'Deposit to SYSTEM'}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
