'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  CssBaseline,
  GlobalStyles,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LeftMenu from './LeftMenu';
import API from '@/lib/api';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DRAWER_WIDTH = 260;

// ── Role → colour + initial ────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { color: string; bg: string }> = {
  Admin:    { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  Agent:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  Customer: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  Merchant: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  System:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const [role, setRole] = React.useState<string>('User');
  const [userName, setUserName] = React.useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);

  // Balance toggle
  const [showBalance, setShowBalance] = React.useState<boolean>(false);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = React.useState<boolean>(false);

  const router = useRouter();

  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch { return true; }
  };

  const forceLogout = React.useCallback(() => {
    localStorage.clear();
    document.cookie = 'token=; path=/; max-age=0';
    router.replace('/login');
  }, [router]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const token    = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    const email    = localStorage.getItem('email') || '';

    if (!token || !userRole) { forceLogout(); return; }
    if (isTokenExpired(token)) { forceLogout(); return; }

    setRole(userRole);
    // Derive display name: first name from stored name, fallback to email prefix
    const storedName = localStorage.getItem('name') || '';
    const firstName = storedName.trim().split(' ')[0] || email.split('@')[0] || userRole;
    setUserName(firstName);
    setIsAuthenticated(true);

    const interval = setInterval(() => {
      const t = localStorage.getItem('token');
      if (!t || isTokenExpired(t)) forceLogout();
    }, 30_000);

    return () => clearInterval(interval);
  }, [forceLogout]);

  if (!isAuthenticated) return null;

  const rc = ROLE_CONFIG[role] || { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };

  const handleDrawerToggle = () => setMobileOpen((p) => !p);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  };

  const handleProfile = () => { handleMenuClose(); router.push('/profile'); };
  const handleChangePassword = () => { handleMenuClose(); router.push('/change-password'); };

  const handleToggleBalance = async () => {
    if (showBalance) { setShowBalance(false); return; }
    const phoneNumber = localStorage.getItem('phoneNumber');
    if (!phoneNumber) return;
    setBalanceLoading(true);
    try {
      const res = await API.get(`/transaction/balance/${phoneNumber}`);
      const fetched =
        typeof res.data.balance === 'number' ? res.data.balance :
        typeof res.data.currentBalance === 'number' ? res.data.currentBalance : 0;
      setBalance(fetched);
      setShowBalance(true);
    } catch { /* ignore */ } finally { setBalanceLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      <CssBaseline />
      <GlobalStyles styles={{ body: { backgroundColor: '#f1f5f9' } }} />

      {/* ── AppBar ─────────────────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: '#1e293b',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 3 }, minHeight: '64px !important' }}>
          {/* Mobile hamburger */}
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: '#94a3b8' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Page label */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16 }}>
              {role} Dashboard
            </Typography>
          </Box>

          {/* Balance toggle */}
          <Button
            onClick={handleToggleBalance}
            disabled={balanceLoading}
            size="small"
            startIcon={
              balanceLoading ? (
                <CircularProgress size={13} sx={{ color: '#818cf8' }} />
              ) : showBalance ? (
                <VisibilityOffIcon sx={{ fontSize: 16 }} />
              ) : (
                <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              mr: 2,
              color: showBalance ? '#10b981' : '#94a3b8',
              bgcolor: showBalance ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showBalance ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              px: 1.5,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' },
              '&:disabled': { opacity: 0.6 },
            }}
          >
            {balanceLoading ? 'Loading…' : showBalance && balance !== null ? `৳ ${balance.toFixed(2)}` : 'Balance'}
          </Button>

          {/* User menu trigger */}
          <Box
            onClick={handleMenuOpen}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
              px: 1.5, py: 0.75, borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              bgcolor: 'rgba(255,255,255,0.04)',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' },
            }}
          >
            <Avatar
              sx={{
                width: 30, height: 30, fontSize: 13, fontWeight: 700,
                bgcolor: rc.bg, color: rc.color, border: `1.5px solid ${rc.color}40`,
              }}
            >
              {role.charAt(0)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.2 }}>
                {userName}
              </Typography>
              <Typography sx={{ fontSize: 11, color: rc.color, fontWeight: 600, lineHeight: 1.2 }}>
                {role}
              </Typography>
            </Box>
            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: '#64748b' }} />
          </Box>

          {/* Profile dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1, bgcolor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                minWidth: 180,
                '& .MuiMenuItem-root': {
                  color: '#e2e8f0', fontSize: 14, fontWeight: 500,
                  borderRadius: '8px', mx: 0.5,
                  '&:hover': { bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8' },
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{userName}</Typography>
              <Chip
                label={role} size="small"
                sx={{ mt: 0.5, bgcolor: rc.bg, color: rc.color, fontWeight: 700, fontSize: 11, height: 20 }}
              />
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 0.5 }} />
            <MenuItem onClick={handleProfile}>👤 Profile</MenuItem>
            <MenuItem onClick={handleChangePassword}>🔑 Change Password</MenuItem>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 0.5 }} />
            <MenuItem onClick={handleLogout} sx={{ color: '#f87171 !important' }}>🚪 Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <LeftMenu mobileOpen={mobileOpen} onDrawerToggle={handleDrawerToggle} />

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: '#ffffff',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
