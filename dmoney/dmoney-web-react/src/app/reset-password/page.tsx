'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';

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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const apiUrl       = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const [token, setToken]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setTokenMissing(true);
    } else {
      setToken(t);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Both password fields are required.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${apiUrl}/user/reset-password`, {
        token,
        password,
        confirmPassword,
      });

      setSuccess('Your password has been reset successfully. Redirecting to login…');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Invalid or expired reset link. Please request a new one.'
      );
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow blobs */}
      <Box sx={{ position: 'absolute', top: -150, left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -100, right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Back to Login */}
      <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
        <Button
          component={Link}
          href="/login"
          sx={{
            color: '#64748b', textTransform: 'none', fontSize: 13, fontWeight: 600,
            '&:hover': { color: '#818cf8' },
          }}
        >
          ← Back to Login
        </Button>
      </Box>

      {/* Card */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          p: { xs: 3, sm: 4.5 },
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Icon + Title */}
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
            🔐
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#f1f5f9', letterSpacing: '-0.5px', mb: 0.5 }}>
            {success ? 'Password Reset!' : 'Set New Password'}
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: 14 }}>
            {success
              ? 'You can now log in with your new password.'
              : 'Choose a strong new password for your account.'}
          </Typography>
        </Box>

        {/* Token missing error */}
        {tokenMissing && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', '& .MuiAlert-icon': { color: '#f87171' } }}
          >
            Invalid reset link. Please request a new password reset.
          </Alert>
        )}

        {/* General error */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', '& .MuiAlert-icon': { color: '#f87171' } }}
          >
            {error}
          </Alert>
        )}

        {/* Success */}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2.5, bgcolor: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', '& .MuiAlert-icon': { color: '#34d399' } }}
          >
            {success}
          </Alert>
        )}

        {/* Form — hide once success or token missing */}
        {!success && !tokenMissing && (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Minimum 4 characters."
              sx={{ ...darkField, mb: 0.5 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirm(e.target.value)}
              sx={{ ...darkField, mb: 2.5 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                height: 50, fontSize: 15, fontWeight: 700,
                textTransform: 'none', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: '0 0 30px rgba(99,102,241,0.4)',
                '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)', boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
                '&:disabled': { background: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.4)' },
              }}
            >
              {loading ? (
                <><CircularProgress size={16} sx={{ color: '#fff', mr: 1 }} />Resetting Password…</>
              ) : (
                'Reset Password →'
              )}
            </Button>
          </Box>
        )}

        {/* Fallback: request new link */}
        {(tokenMissing || error) && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography sx={{ color: '#64748b', fontSize: 14 }}>
              Need a new link?{' '}
              <Box
                component="span"
                onClick={() => router.push('/forgot-password')}
                sx={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600, '&:hover': { color: '#a5b4fc', textDecoration: 'underline' } }}
              >
                Request again
              </Box>
            </Typography>
          </Box>
        )}

        {/* Divider */}
        <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Typography sx={{ color: '#475569', fontSize: 12 }}>OR</Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#64748b', fontSize: 14 }}>
            Remember your password?{' '}
            <Box
              component="span"
              onClick={() => router.push('/login')}
              sx={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600, '&:hover': { color: '#a5b4fc', textDecoration: 'underline' } }}
            >
              Sign In
            </Box>
          </Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Chip
          label="🔒 Secure password reset — link valid for 1 hour"
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}
        />
      </Box>
    </Box>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js 15 App Router
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
