'use client';

import React, { useState } from 'react';
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

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP step
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const envParam = searchParams.get('env');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY || 'ROADTOSDET';

  // ── Helper: seconds remaining until JWT expires (for cookie max-age) ──────
  const getTokenMaxAge = (token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (typeof payload.exp === 'number') {
        const secsLeft = payload.exp - Math.floor(Date.now() / 1000);
        return Math.max(secsLeft, 0);
      }
    } catch {
      // fall through
    }
    return 86400;
  };

  // ── Shared: fetch user profile then store & redirect ─────────────────────
  const completeLogin = async (token: string) => {
    const isEmail = email.includes('@');
    const encodedValue = encodeURIComponent(email);

    let user;
    if (isEmail) {
      const resp = await axios.get(`${apiUrl}/user/search/email/${encodedValue}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-AUTH-SECRET-KEY': secretKey },
      });
      user = resp.data.user;
    } else {
      const resp = await axios.get(`${apiUrl}/user/search/phonenumber/${encodedValue}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-AUTH-SECRET-KEY': secretKey },
      });
      user = resp.data.user;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('email', user.email);
      localStorage.setItem('name', user.name || '');
      localStorage.setItem('userId', user.id?.toString() || '');
      localStorage.setItem('phoneNumber', user.phone_number);
      localStorage.setItem('photo', user.photo || '');
      localStorage.setItem('balance', user.balance?.toString() || '0');
      document.cookie = `token=${token}; path=/; max-age=${getTokenMaxAge(token)}`;
    }

    setTimeout(() => router.replace('/profile'), 100);
  };

  // ── Step 1: Verify credentials ────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationError('');

    if (!email || !password) {
      setValidationError('Email/Phone Number and Password cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const loginResponse = await axios.post(`${apiUrl}/user/login`, { email, password });

      if (loginResponse.data.token) {
        await completeLogin(loginResponse.data.token);
        return;
      }

      if (loginResponse.data.otpRequired) {
        setOtpInfo(loginResponse.data.message || 'OTP sent to your registered email address.');
        setOtpRequired(true);
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 400) {
        setError('Login failed. Please input correct email/phone number or password.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error. Please ensure the backend API is running.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 4) {
      setError('Please enter the 4-digit OTP.');
      return;
    }

    setOtpLoading(true);
    try {
      const verifyUrl = envParam
        ? `${apiUrl}/user/verify-otp?env=${envParam}`
        : `${apiUrl}/user/verify-otp`;
      const verifyResponse = await axios.post(verifyUrl, {
        identifier: email,
        otp: otp,
      });

      await completeLogin(verifyResponse.data.token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Go back to credentials step ───────────────────────────────────────────
  const handleBack = () => {
    setOtpRequired(false);
    setOtp('');
    setOtpInfo('');
    setError('');
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
              {otpRequired ? 'Verify Your Identity' : 'Welcome Back'}
            </Typography>
          </Box>
          <Typography sx={{ color: '#64748b', fontSize: 14 }}>
            {otpRequired
              ? 'Enter the OTP sent to your email'
              : 'Sign in to your dMoney account'}
          </Typography>
        </Box>

        {/* Alerts */}
        {validationError && (
          <Alert
            severity="warning"
            sx={{ mb: 2.5, bgcolor: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', '& .MuiAlert-icon': { color: '#fbbf24' } }}
          >
            {validationError}
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', '& .MuiAlert-icon': { color: '#f87171' } }}
          >
            {error}
          </Alert>
        )}

        {/* ── Step 1: Credentials ─────────────────────────────────────── */}
        {!otpRequired && (
          <>
            <Box component="form" onSubmit={handleLogin} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email or Phone Number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email or phone number"
                sx={{ ...darkField, mb: 0.5 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ ...darkField, mb: 0.5 }}
              />

              {/* Forgot password link */}
              <Box sx={{ textAlign: 'right', mb: 1.5 }}>
                <Box
                  component="span"
                  onClick={() => router.push('/forgot-password')}
                  sx={{ color: '#64748b', fontSize: 13, cursor: 'pointer', '&:hover': { color: '#818cf8', textDecoration: 'underline' } }}
                >
                  Forgot password?
                </Box>
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 1, height: 50, fontSize: 15, fontWeight: 700,
                  textTransform: 'none', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  boxShadow: '0 0 30px rgba(99,102,241,0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)', boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
                  '&:disabled': { background: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.4)' },
                }}
              >
                {loading ? (
                  <><CircularProgress size={16} sx={{ color: '#fff', mr: 1 }} />Verifying…</>
                ) : (
                  'Login →'
                )}
              </Button>
            </Box>

            {/* Divider */}
            <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
              <Typography sx={{ color: '#475569', fontSize: 12 }}>OR</Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#64748b', fontSize: 14 }}>
                Don't have an account?{' '}
                <Box
                  component="span"
                  onClick={() => router.push('/register')}
                  sx={{ color: '#818cf8', cursor: 'pointer', fontWeight: 600, '&:hover': { color: '#a5b4fc', textDecoration: 'underline' } }}
                >
                  Sign Up Free
                </Box>
              </Typography>
            </Box>
          </>
        )}

        {/* ── Step 2: OTP ─────────────────────────────────────────────── */}
        {otpRequired && (
          <>
            {/* OTP info banner */}
            <Box
              sx={{
                mb: 3, p: 2.5, borderRadius: '12px',
                bgcolor: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', gap: 1.5, alignItems: 'flex-start',
              }}
            >
              <Box sx={{ mt: 0.3 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
              </Box>
              <Typography sx={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.7 }}>
                {otpInfo}
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleVerifyOtp} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Enter 4-Digit OTP"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setOtp(val);
                }}
                inputProps={{ maxLength: 4, inputMode: 'numeric', pattern: '[0-9]*' }}
                placeholder="• • • •"
                helperText="Check your registered email. Valid for 2 minutes."
                sx={{
                  ...darkField,
                  mb: 2,
                  '& input': { textAlign: 'center', fontSize: 28, letterSpacing: '0.5em', fontWeight: 700 },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={otpLoading}
                sx={{
                  height: 50, fontSize: 15, fontWeight: 700,
                  textTransform: 'none', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  boxShadow: '0 0 30px rgba(99,102,241,0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
                  '&:disabled': { background: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.4)' },
                }}
              >
                {otpLoading ? (
                  <><CircularProgress size={16} sx={{ color: '#fff', mr: 1 }} />Verifying OTP…</>
                ) : (
                  'Verify OTP →'
                )}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={handleBack}
                disabled={otpLoading}
                sx={{
                  mt: 1.5, textTransform: 'none', color: '#64748b', fontSize: 14,
                  '&:hover': { color: '#818cf8', bgcolor: 'transparent' },
                }}
              >
                ← Back to Login
              </Button>
            </Box>
          </>
        )}
      </Box>

      {/* Footer note */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Chip
          label="🔒 Secured with JWT + OTP Authentication"
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}
        />
      </Box>
    </Box>
  );
}

export default function Login() {
  return (
    <React.Suspense fallback={null}>
      <LoginContent />
    </React.Suspense>
  );
}
