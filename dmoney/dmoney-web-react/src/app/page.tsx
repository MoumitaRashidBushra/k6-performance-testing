'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  AppBar,
  Toolbar,
  Divider,
} from '@mui/material';

// ─── Icons as inline SVG components (no extra deps) ─────────────────────────
const IconBug = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.5 1.5M16 2l-1.5 1.5M9 9h6M9 13h6M12 17v4M5 9l-2-2M19 9l2-2M5 13l-2 2M19 13l2 2M9 20H7a4 4 0 01-4-4V9a5 5 0 0110 0v7a4 4 0 01-4 4zM15 20h2a4 4 0 004-4V9a5 5 0 00-10 0" />
  </svg>
);

const IconApi = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <path d="M8 10l-3 3 3 3M16 10l3 3-3 3M13 7l-2 10" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 4v6c0 5-3.5 9.5-8 11C4.5 21.5 4 17 4 12V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconDatabase = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v4c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 9v4c0 1.66 4 3 9 3s9-1.34 9-3V9" />
    <path d="M3 13v4c0 1.66 4 3 9 3s9-1.34 9-3v-4" />
  </svg>
);

const IconRobot = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M12 2v6M8 2h8M9 13h.01M15 13h.01M9 16h6" />
    <circle cx="12" cy="2" r="1" fill="currentColor" />
  </svg>
);

const IconMobile = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M12 18h.01" />
  </svg>
);

// ─── Feature cards data ───────────────────────────────────────────────────────
const features = [
  {
    icon: <IconBug />,
    title: 'Manual Testing',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    chips: ['Test Cases', 'Bug Reports', 'Exploratory'],
    desc: 'Practice writing detailed test cases, boundary value analysis, equivalence partitioning, and exploratory testing on real fintech flows — registration, OTP login, deposits, withdrawals, and more.',
  },
  {
    icon: <IconApi />,
    title: 'API Testing',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    chips: ['REST', 'Postman', 'Newman'],
    desc: 'Learn to craft HTTP requests for 30+ REST endpoints. Practice auth token flows, request chaining, response schema validation, and build Postman collections with pre-request scripts.',
  },
  {
    icon: <IconShield />,
    title: 'Security Testing',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    chips: ['Auth Bypass', 'JWT', 'OWASP'],
    desc: 'Explore JWT token manipulation, role-based access bypass (customer vs agent vs admin), SQL injection surfaces, OTP brute-force scenarios, and Stripe webhook security.',
  },
  {
    icon: <IconDatabase />,
    title: 'Database Testing',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    chips: ['MySQL', 'Sequelize', 'Ledger'],
    desc: 'Validate multi-entry ledger bookkeeping, double-entry transaction integrity, commission records, user balance caps, and transaction-limit constraints directly in MySQL.',
  },
  {
    icon: <IconRobot />,
    title: 'Test Automation',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    chips: ['Cypress', 'Playwright', 'CI/CD'],
    desc: 'Build end-to-end automation suites covering login, fund transfers, payment flows, and admin operations. Integrate with GitHub Actions to run tests on every push.',
  },
  {
    icon: <IconMobile />,
    title: 'Fintech Scenarios',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    chips: ['Stripe', 'OTP', 'Limits'],
    desc: 'Work with real-world fintech scenarios: Stripe card cash-in, OTP-based two-factor login, daily/monthly transaction limits, multi-role dashboards, and commission calculations.',
  },
];

// ─── Role breakdown ───────────────────────────────────────────────────────────
const roles = [
  { role: 'Admin', color: '#ef4444', actions: 'Create users, deposit to SYSTEM, view all transactions, manage roles' },
  { role: 'Agent', color: '#f59e0b', actions: 'Cash-in to customers, self-statement, payment to merchants' },
  { role: 'Customer', color: '#10b981', actions: 'Send money, payment, cash-out, Stripe cash-in, self-statement' },
  { role: 'Merchant', color: '#6366f1', actions: 'Receive payments, cash-out, view statement' },
  { role: 'System', color: '#8b5cf6', actions: 'Central liquidity pool — source for all agent deposits' },
];

// ─── Stat boxes ───────────────────────────────────────────────────────────────
const stats = [
  { value: '30+', label: 'REST Endpoints' },
  { value: '5', label: 'User Roles' },
  { value: '50+', label: 'Test Scenarios' },
  { value: '100%', label: 'Open Source' },
];

// ─── Page component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();

  // If already authenticated, skip landing and go to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()) {
          router.replace('/profile');
          return;
        }
      } catch {
        // invalid token — stay on landing
      }
      // expired or malformed — clear it
      localStorage.removeItem('token');
    }
  }, [router]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(15,15,26,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, md: 4 } }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 16, color: '#fff',
              }}
            >
              D
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              dMoney
            </Typography>
            <Chip
              label="QA Lab"
              size="small"
              sx={{ ml: 1, bgcolor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 700, fontSize: 10, height: 20 }}
            />
          </Box>

          {/* Nav Links */}
          <Stack direction="row" spacing={1}>
            <Button
              component={Link}
              href="/register"
              variant="outlined"
              size="small"
              sx={{
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#e2e8f0',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                px: 2.5,
                '&:hover': { borderColor: '#6366f1', color: '#818cf8', bgcolor: 'rgba(99,102,241,0.08)' },
              }}
            >
              Sign Up
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '8px',
                px: 2.5,
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
              }}
            >
              Login
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        {/* Background glow blobs */}
        <Box sx={{ position: 'absolute', top: -100, left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: 50, right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <Chip
            label="🧪 Open-Source QA Practice Platform"
            sx={{
              mb: 3, bgcolor: 'rgba(99,102,241,0.12)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.3)', fontWeight: 600,
              fontSize: 13, height: 32, px: 1,
            }}
          />

          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
              mb: 3,
              background: 'linear-gradient(135deg, #fff 0%, #818cf8 50%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Learn QA Testing on a<br />Real Fintech Application
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: 16, md: 18 },
              color: '#94a3b8',
              maxWidth: 660,
              mx: 'auto',
              mb: 5,
              lineHeight: 1.8,
            }}
          >
            dMoney is a fully-functional mobile money platform built for QA engineers to practice
            manual testing, API testing, security testing, database testing, and test automation
            — all on realistic financial workflows.
          </Typography>

          {/* CTA Buttons */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 7 }}>
            <Button
              component={Link}
              href="/register"
              variant="contained"
              size="large"
              sx={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', fontWeight: 700, textTransform: 'none',
                borderRadius: '12px', px: 4, py: 1.5, fontSize: 16,
                boxShadow: '0 0 40px rgba(99,102,241,0.5)',
                '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)', transform: 'translateY(-2px)', boxShadow: '0 0 60px rgba(99,102,241,0.6)' },
                transition: 'all 0.2s',
              }}
            >
              Get Started Free →
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              size="large"
              sx={{
                borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0',
                fontWeight: 600, textTransform: 'none', borderRadius: '12px',
                px: 4, py: 1.5, fontSize: 16,
                '&:hover': { borderColor: '#6366f1', color: '#818cf8', bgcolor: 'rgba(99,102,241,0.08)' },
                transition: 'all 0.2s',
              }}
            >
              Login to Dashboard
            </Button>
          </Stack>

          {/* Stats row */}
          <Grid container spacing={2} justifyContent="center">
            {stats.map((s) => (
              <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
                <Box
                  sx={{
                    p: 2, borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography sx={{ fontWeight: 900, fontSize: 28, color: '#818cf8', lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── What Can You Learn ───────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '2px', mb: 1 }}>
              Testing Disciplines
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
              Everything a QA Engineer Needs
            </Typography>
            <Typography sx={{ color: '#64748b', mt: 1.5, fontSize: 16 }}>
              Six distinct testing disciplines — all practised on the same live application
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {features.map((f) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '18px',
                    transition: 'all 0.25s',
                    '&:hover': {
                      border: `1px solid ${f.color}40`,
                      bgcolor: f.bg,
                      transform: 'translateY(-4px)',
                      boxShadow: `0 20px 40px ${f.color}15`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 64, height: 64, borderRadius: '16px',
                        bgcolor: `${f.color}15`,
                        border: `1px solid ${f.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: f.color, mb: 2.5,
                      }}
                    >
                      {f.icon}
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#f1f5f9', mb: 1, fontSize: 17 }}>
                      {f.title}
                    </Typography>

                    <Stack direction="row" flexWrap="wrap" gap={0.7} sx={{ mb: 2 }}>
                      {f.chips.map((c) => (
                        <Chip
                          key={c} label={c} size="small"
                          sx={{ bgcolor: `${f.color}12`, color: f.color, fontWeight: 700, fontSize: 11, height: 22, border: `1px solid ${f.color}25` }}
                        />
                      ))}
                    </Stack>

                    <Typography sx={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.75 }}>
                      {f.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── User Roles ───────────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '2px', mb: 1 }}>
              Multi-Role System
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
              Five User Roles to Test
            </Typography>
            <Typography sx={{ color: '#64748b', mt: 1.5, fontSize: 16 }}>
              Each role has unique permissions and workflows — a goldmine for role-based access control testing
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {roles.map((r) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.role}>
                <Box
                  sx={{
                    p: 3, borderRadius: '16px',
                    border: `1px solid ${r.color}25`,
                    bgcolor: `${r.color}08`,
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: `${r.color}12`, transform: 'translateY(-2px)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                    <Typography sx={{ fontWeight: 800, color: r.color, fontSize: 16 }}>
                      {r.role}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.7 }}>
                    {r.actions}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '2px', mb: 1 }}>
              Getting Started
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
              Up and Running in 3 Steps
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              { step: '01', title: 'Register an Account', color: '#6366f1', desc: 'Sign up with your Gmail address. An OTP will be sent to verify your email. Complete the 2-step registration flow.' },
              { step: '02', title: 'Explore the Dashboard', color: '#10b981', desc: 'Login as Customer, Agent, Merchant, or Admin. Each role reveals different screens and API endpoints to test.' },
              { step: '03', title: 'Start Testing', color: '#f59e0b', desc: 'Write test cases, fire API requests in Postman, inspect the MySQL database, or automate flows with Cypress / Playwright.' },
            ].map((s) => (
              <Grid size={{ xs: 12, md: 4 }} key={s.step}>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Box
                    sx={{
                      width: 56, height: 56, borderRadius: '16px',
                      background: `linear-gradient(135deg, ${s.color}, ${s.color}99)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mx: 'auto', mb: 2,
                      fontWeight: 900, fontSize: 18, color: '#fff',
                      boxShadow: `0 8px 24px ${s.color}40`,
                    }}
                  >
                    {s.step}
                  </Box>
                  <Typography sx={{ fontWeight: 800, color: '#f1f5f9', fontSize: 17, mb: 1 }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.75 }}>
                    {s.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Tech Stack ───────────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 6, md: 8 }, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Container maxWidth="lg">
          <Typography sx={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', mb: 4 }}>
            Tech Stack You'll Work With
          </Typography>
          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1.5}>
            {['Node.js', 'Express', 'MySQL', 'Sequelize ORM', 'JWT Auth', 'Next.js 15', 'React', 'TypeScript', 'Material UI', 'Stripe API', 'Nodemailer', 'REST API', 'Postman', 'Swagger UI'].map((tech) => (
              <Chip
                key={tech}
                label={tech}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontWeight: 600,
                  fontSize: 13,
                  height: 34,
                  '&:hover': { bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' },
                  transition: 'all 0.2s',
                  cursor: 'default',
                }}
              />
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          mx: { xs: 2, md: 6 },
          mb: 8,
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,185,129,0.10) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          p: { xs: 5, md: 8 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)', pointerEvents: 'none' }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '2px', mb: 1.5 }}>
          Ready to Level Up?
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px', mb: 2 }}>
          Start Practising on dMoney Today
        </Typography>
        <Typography sx={{ color: '#94a3b8', mb: 4, fontSize: 16, maxWidth: 520, mx: 'auto', lineHeight: 1.8 }}>
          No setup required on your end. Create a free account and immediately access all testing scenarios — manual, API, security, database, and automation.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button
            component={Link}
            href="/register"
            variant="contained"
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', fontWeight: 700, textTransform: 'none',
              borderRadius: '12px', px: 5, py: 1.5, fontSize: 15,
              boxShadow: '0 0 40px rgba(99,102,241,0.5)',
              '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)', transform: 'translateY(-2px)' },
              transition: 'all 0.2s',
            }}
          >
            Create Free Account
          </Button>
          <Button
            component={Link}
            href="/login"
            variant="outlined"
            size="large"
            sx={{
              borderColor: 'rgba(255,255,255,0.2)', color: '#e2e8f0',
              fontWeight: 600, textTransform: 'none', borderRadius: '12px',
              px: 5, py: 1.5, fontSize: 15,
              '&:hover': { borderColor: '#6366f1', color: '#818cf8', bgcolor: 'rgba(99,102,241,0.08)' },
              transition: 'all 0.2s',
            }}
          >
            Already have an account? Login
          </Button>
        </Stack>
      </Box>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', py: 4 }}>
        <Container maxWidth="lg">
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 3 }} />
          {/* Single row: brand left | Developed By center | nav links right */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
            {/* Left: brand */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 28, height: 28, borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 13, color: '#fff',
                }}
              >
                D
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: 14 }}>
                dMoney — QA Practice Platform
              </Typography>
            </Box>

            {/* Center: Developed By */}
            <Typography sx={{ fontSize: 12, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
              Developed By —{' '}
              <a
                href="https://roadtocareer.net"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#818cf8', fontWeight: 700, textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Road to Career
              </a>
            </Typography>

            {/* Right: nav links */}
            <Stack direction="row" spacing={3} justifyContent="flex-end">
              <Button component={Link} href="/login" sx={{ color: '#475569', textTransform: 'none', fontSize: 13, minWidth: 0, '&:hover': { color: '#818cf8' } }}>Login</Button>
              <Button component={Link} href="/register" sx={{ color: '#475569', textTransform: 'none', fontSize: 13, minWidth: 0, '&:hover': { color: '#10b981' } }}>Sign Up</Button>
            </Stack>
          </Box>
        </Container>
      </Box>

    </Box>
  );
}
