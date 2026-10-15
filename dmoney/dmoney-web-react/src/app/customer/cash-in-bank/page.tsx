'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
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
  CircularProgress,
  Chip,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Initialise Stripe once — outside the component to avoid re-creation on renders
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Stripe CardElement styling (matches MUI look) ────────────────────────────
const CARD_ELEMENT_OPTIONS = {
  hidePostalCode: true,   // ZIP / postal code is not required — hide it from the UI
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      '::placeholder': { color: '#aab7c4' },
    },
    invalid: {
      color: '#d32f2f',
      iconColor: '#d32f2f',
    },
  },
};

// ─── Inner payment form (must live inside <Elements>) ─────────────────────────
interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}

function PaymentForm({ clientSecret, amount, onSuccess, onBack }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found. Please refresh and try again.');
      setLoading(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElement } }
    );

    if (stripeError) {
      setError(stripeError.message || 'Payment failed. Please try again.');
      setLoading(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError('Payment was not completed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceIcon color="primary" />
          <Typography variant="h6">Card Details</Typography>
        </Box>

        {/* Amount summary */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'white',
            p: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="body1">Amount to Pay</Typography>
          <Typography variant="h6" fontWeight="bold">
            ৳ {amount.toFixed(2)}
          </Typography>
        </Box>

        {/* Stripe CardElement wrapped in a MUI-styled box */}
        <Box
          sx={{
            border: '1px solid rgba(0,0,0,0.23)',
            borderRadius: 1,
            p: '14px 12px',
            '&:hover': { borderColor: 'text.primary' },
            transition: 'border-color 0.2s',
          }}
        >
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          textAlign="center"
        >
          🔒 Your card details are encrypted and processed securely by Stripe.
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onBack}
            disabled={loading}
            fullWidth
          >
            ← Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!stripe || loading}
            fullWidth
            startIcon={
              loading ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {loading ? 'Processing...' : `Pay ৳ ${amount.toFixed(2)}`}
          </Button>
        </Box>

        {/* Test card hint for development */}
        <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
          <strong>Test card:</strong>&nbsp; 4242 4242 4242 4242 &nbsp;·&nbsp;
          Any future date &nbsp;·&nbsp; Any 3-digit CVC
        </Alert>
      </Stack>
    </form>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function CashInBank() {
  const router = useRouter();

  const [step, setStep]                     = useState<1 | 2 | 3>(1);
  const [amount, setAmount]                 = useState('');
  const [clientSecret, setClientSecret]     = useState('');
  const [confirmedAmount, setConfirmedAmount] = useState(0);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [trnxId, setTrnxId]                 = useState('');
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [limitInfo, setLimitInfo]           = useState({ min: 10, max: 10000 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.replace('/login');
  }, [router]);

  // ── Step 1: validate amount + create Stripe PaymentIntent ────────────────
  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/transaction/stripe/create-intent', {
        amount: amt,
      });

      // Backend returns HTTP 208 (a 2xx code) for limit-exceeded — axios won't
      // throw, so we must explicitly check whether clientSecret was returned.
      if (!response.data.clientSecret) {
        setError(response.data.message || 'Request failed. Please try again.');
        return;
      }

      const { clientSecret: cs, amount: serverAmt, minAmount, maxAmount } =
        response.data;

      setClientSecret(cs);
      setConfirmedAmount(serverAmt);
      setLimitInfo({ min: minAmount, max: maxAmount });
      setStep(2);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to initiate payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 → 3: Stripe payment succeeded → confirm wallet credit ──────────
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setError('');
    setLoading(true);
    try {
      const response = await API.post('/transaction/stripe/confirm', {
        paymentIntentId,
      });
      setTrnxId(response.data.trnxId);
      if (typeof response.data.currentBalance === 'number') {
        setCurrentBalance(response.data.currentBalance);
      }
      setStep(3);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Payment succeeded but wallet update failed. Please contact support with your Transaction ID.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setAmount('');
    setClientSecret('');
    setError('');
    setTrnxId('');
    setCurrentBalance(null);
  };

  return (
    <DashboardLayout>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '70vh',
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Page heading */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <AccountBalanceIcon sx={{ fontSize: 32 }} color="primary" />
          <Typography
            variant="h4"
            sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
          >
            Cash In (Bank)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Deposit money to your DMoney wallet using your bank card
        </Typography>

        {/* Step indicator chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {(['Amount', 'Payment', 'Done'] as const).map((label, idx) => (
            <Chip
              key={label}
              label={`${idx + 1}. ${label}`}
              color={
                step === idx + 1
                  ? 'primary'
                  : step > idx + 1
                  ? 'success'
                  : 'default'
              }
              variant={step === idx + 1 ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Box>

        <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 520, width: '100%' }}>

          {/* ══ STEP 1 — Enter amount ══════════════════════════════════════════ */}
          {step === 1 && (
            <form onSubmit={handleAmountSubmit}>
              <Stack spacing={2}>
                <Typography variant="h6">Enter Amount</Typography>

                <TextField
                  fullWidth
                  label="Amount (BDT)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  inputProps={{
                    min: limitInfo.min,
                    max: limitInfo.max,
                    step: 0.01,
                  }}
                  placeholder={`Min: ${limitInfo.min} — Max: ${limitInfo.max}`}
                  helperText={`Allowed range: ৳${limitInfo.min} – ৳${limitInfo.max}`}
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  size="large"
                  startIcon={
                    loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <AccountBalanceIcon />
                    )
                  }
                >
                  {loading ? 'Checking...' : 'Continue to Payment'}
                </Button>
              </Stack>
            </form>
          )}

          {/* ══ STEP 2 — Stripe card form ══════════════════════════════════════ */}
          {step === 2 && clientSecret && (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  clientSecret={clientSecret}
                  amount={confirmedAmount}
                  onSuccess={handlePaymentSuccess}
                  onBack={() => {
                    setStep(1);
                    setError('');
                    setClientSecret('');
                  }}
                />
              </Elements>
            </>
          )}

          {/* ══ STEP 3 — Success receipt ══════════════════════════════════════ */}
          {step === 3 && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 32 }} />
                <Typography variant="h6" color="success.main">
                  Cash In Successful!
                </Typography>
              </Box>

              <Alert severity="success">
                ৳{confirmedAmount.toFixed(2)} has been added to your DMoney
                wallet.
              </Alert>

              <Divider />

              {/* Receipt card */}
              <Box
                sx={{
                  bgcolor: 'grey.50',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Transaction ID
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{ wordBreak: 'break-all', fontSize: '0.78rem' }}
                    >
                      {trnxId}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Amount Deposited
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="success.main"
                    >
                      + ৳{confirmedAmount.toFixed(2)}
                    </Typography>
                  </Box>

                  {currentBalance !== null && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Balance
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        ৳ {currentBalance.toFixed(2)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Button
                variant="contained"
                onClick={handleReset}
                fullWidth
                startIcon={<AccountBalanceIcon />}
              >
                Make Another Cash In
              </Button>
            </Stack>
          )}

        </Paper>
      </Box>
    </DashboardLayout>
  );
}
