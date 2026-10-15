'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Stack,
  Chip,
} from '@mui/material';

// ─── Shared dark-theme text-field styles ─────────────────────────────────────
const darkField = {
  '& .MuiOutlinedInput-root': {
    color: '#e2e8f0',
    bgcolor: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { color: '#64748b' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
  '& .MuiFormHelperText-root': { color: '#475569' },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px rgba(15,15,26,0.95) inset',
    WebkitTextFillColor: '#e2e8f0',
  },
};

// ─── Dark Select styles ───────────────────────────────────────────────────────
const darkSelect = {
  color: '#e2e8f0',
  bgcolor: 'rgba(255,255,255,0.04)',
  borderRadius: '10px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.5)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1', borderWidth: 2 },
  '& .MuiSvgIcon-root': { color: '#64748b' },
};

const roleInfo: Record<string, { color: string; desc: string }> = {
  Customer: { color: '#10b981', desc: 'Send money, pay merchants, cash-out, Stripe cash-in' },
  Agent: { color: '#f59e0b', desc: 'Cash-in to customers, payment to merchants' },
  Merchant: { color: '#6366f1', desc: 'Receive payments, cash-out, view statement' },
};

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    nid: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: SelectChangeEvent) => {
    setFormData((prev) => ({ ...prev, role: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.email || !formData.password || !formData.phone_number || !formData.nid || !formData.role) {
      setError('All fields are required.');
      return;
    }

    if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
      setError('Only Gmail addresses (@gmail.com) are allowed for registration.');
      return;
    }

    if (formData.phone_number.length !== 11) {
      setError('Phone number must be exactly 11 digits.');
      return;
    }

    if (formData.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await axios.post(`${apiUrl}/user/register`, formData);

      setSuccess(
        response.data.message ||
          'Registration successful! Your account is pending admin approval. You can now login.'
      );

      setFormData({ name: '', email: '', password: '', phone_number: '', nid: '', role: '' });

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      if (err.response?.status === 208) {
        setError(err.response.data.message || 'Account already exists with this email or phone number.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0f0f1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow blobs */}
      <Box sx={{ position: 'absolute', top: -150, right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -100, left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Back to Home */}
      <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
        <Button
          component={Link}
          href="/"
          sx={{
            color: '#64748b', textTransform: 'none', fontSize: 13, fontWeight: 600,
            '&:hover': { color: '#818cf8' },
          }}
        >
          ← Back to Home
        </Button>
      </Box>

      {/* Card */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          p: { xs: 3, sm: 4.5 },
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo + Brand */}
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box
            sx={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 22, color: '#fff',
              mx: 'auto', mb: 2,
              boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
            }}
          >
            D
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#f1f5f9', letterSpacing: '-0.5px', mb: 0.5 }}>
            Create an Account
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: 14 }}>
            Join dMoney — the QA practice platform
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', '& .MuiAlert-icon': { color: '#f87171' } }}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2.5, bgcolor: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', '& .MuiAlert-icon': { color: '#34d399' } }}
          >
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>

            {/* Full Name */}
            <TextField
              fullWidth
              required
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              inputProps={{ minLength: 3, maxLength: 50 }}
              disabled={loading}
              sx={darkField}
            />

            {/* Email */}
            <TextField
              fullWidth
              required
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="yourname@gmail.com"
              helperText="Only Gmail addresses (@gmail.com) are accepted"
              disabled={loading}
              sx={darkField}
            />

            {/* Password */}
            <TextField
              fullWidth
              required
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 4 characters"
              disabled={loading}
              sx={darkField}
            />

            {/* Phone */}
            <TextField
              fullWidth
              required
              label="Phone Number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="11-digit phone number (e.g. 01XXXXXXXXX)"
              inputProps={{ maxLength: 11 }}
              disabled={loading}
              sx={darkField}
            />

            {/* NID */}
            <TextField
              fullWidth
              required
              label="National ID (NID)"
              name="nid"
              value={formData.nid}
              onChange={handleChange}
              placeholder="7–13 digit NID number"
              inputProps={{ minLength: 7, maxLength: 13 }}
              disabled={loading}
              sx={darkField}
            />

            {/* Role Selector */}
            <FormControl fullWidth required>
              <InputLabel sx={{ color: '#64748b', '&.Mui-focused': { color: '#818cf8' } }}>
                Account Type (Role)
              </InputLabel>
              <Select
                value={formData.role}
                onChange={handleRoleChange}
                label="Account Type (Role)"
                disabled={loading}
                sx={darkSelect}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      mt: 0.5,
                      '& .MuiMenuItem-root': {
                        color: '#e2e8f0',
                        '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' },
                        '&.Mui-selected': { bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8' },
                        '&.Mui-selected:hover': { bgcolor: 'rgba(99,102,241,0.2)' },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="Customer">👤 Customer</MenuItem>
                <MenuItem value="Agent">🏪 Agent</MenuItem>
                <MenuItem value="Merchant">🏢 Merchant</MenuItem>
              </Select>
            </FormControl>

            {/* Role description */}
            {formData.role && roleInfo[formData.role] && (
              <Box
                sx={{
                  p: 2, borderRadius: '10px',
                  bgcolor: `${roleInfo[formData.role].color}0d`,
                  border: `1px solid ${roleInfo[formData.role].color}25`,
                  display: 'flex', gap: 1, alignItems: 'center',
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: roleInfo[formData.role].color, flexShrink: 0, boxShadow: `0 0 6px ${roleInfo[formData.role].color}` }} />
                <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>
                  <strong style={{ color: roleInfo[formData.role].color }}>{formData.role}:</strong>{' '}
                  {roleInfo[formData.role].desc}
                </Typography>
              </Box>
            )}

            {/* Pending notice */}
            <Box
              sx={{
                p: 2, borderRadius: '10px',
                bgcolor: 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', gap: 1.5, alignItems: 'flex-start',
              }}
            >
              <Box sx={{ mt: 0.2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </Box>
              <Typography sx={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.65 }}>
                After registration, your account will be <strong style={{ color: '#fbbf24' }}>pending</strong> approval.
                An admin will activate your account before you can perform transactions.
              </Typography>
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 0.5, height: 50, fontSize: 15, fontWeight: 700,
                textTransform: 'none', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: '0 0 30px rgba(99,102,241,0.4)',
                '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)', boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
                '&:disabled': { background: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.4)' },
              }}
            >
              {loading ? (
                <><CircularProgress size={16} sx={{ color: '#fff', mr: 1 }} />Registering…</>
              ) : (
                'Create Account →'
              )}
            </Button>

            {/* Divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
              <Typography sx={{ color: '#475569', fontSize: 12 }}>OR</Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
            </Box>

            <Box sx={{ textAlign: 'center', pb: 0.5 }}>
              <Typography sx={{ color: '#64748b', fontSize: 14 }}>
                Already have an account?{' '}
                <Box
                  component="span"
                  onClick={() => router.push('/login')}
                  sx={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600, '&:hover': { color: '#a5b4fc', textDecoration: 'underline' } }}
                >
                  Login here
                </Box>
              </Typography>
            </Box>

          </Stack>
        </Box>
      </Box>

      {/* Footer note */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Chip
          label="🧪 dMoney — QA Practice Platform"
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}
        />
      </Box>
    </Box>
  );
}
