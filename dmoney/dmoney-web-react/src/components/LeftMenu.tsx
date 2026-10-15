'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Drawer, List, ListItem, ListItemText, Box, Typography, Chip } from '@mui/material';

// MUI icons
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import SendIcon from '@mui/icons-material/Send';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CreditCardIcon from '@mui/icons-material/CreditCard';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface LeftMenuProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
}

const DRAWER_WIDTH = 260;

const ROLE_CONFIG: Record<string, { color: string; bg: string }> = {
  Admin:    { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  Agent:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  Customer: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  Merchant: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  System:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

const ROLE_MENUS: Record<string, MenuItem[]> = {
  Admin: [
    { name: 'User List',        path: '/admin/users',         icon: <PeopleAltIcon sx={{ fontSize: 18 }} /> },
    { name: 'Create User',      path: '/admin/users/create',  icon: <PersonAddAltIcon sx={{ fontSize: 18 }} /> },
    { name: 'Deposit (SYSTEM)', path: '/admin/deposit',       icon: <AccountBalanceIcon sx={{ fontSize: 18 }} /> },
    { name: 'Transaction List', path: '/admin/transactions',  icon: <ListAltIcon sx={{ fontSize: 18 }} /> },
  ],
  Agent: [
    { name: 'Cash In',        path: '/agent/cash-in',        icon: <ArrowCircleDownIcon sx={{ fontSize: 18 }} /> },
    { name: 'Payment',        path: '/agent/payment',        icon: <PaymentsIcon sx={{ fontSize: 18 }} /> },
    { name: 'Self Statement', path: '/agent/self-statement', icon: <ReceiptLongIcon sx={{ fontSize: 18 }} /> },
  ],
  Customer: [
    { name: 'Cash In (Bank)',  path: '/customer/cash-in-bank',     icon: <CreditCardIcon sx={{ fontSize: 18 }} /> },
    { name: 'Send Money',      path: '/customer/send-money',       icon: <SendIcon sx={{ fontSize: 18 }} /> },
    { name: 'Cash Out',        path: '/customer/cash-out',         icon: <ArrowCircleUpIcon sx={{ fontSize: 18 }} /> },
    { name: 'Payment',         path: '/customer/payment',          icon: <PaymentsIcon sx={{ fontSize: 18 }} /> },
    { name: 'Self Statement',  path: '/customer/self-statement',   icon: <ReceiptLongIcon sx={{ fontSize: 18 }} /> },
  ],
  Merchant: [
    { name: 'Cash Out',       path: '/merchant/cash-out',         icon: <ArrowCircleUpIcon sx={{ fontSize: 18 }} /> },
    { name: 'Self Statement', path: '/merchant/self-statement',   icon: <ReceiptLongIcon sx={{ fontSize: 18 }} /> },
  ],
};

const LeftMenu = ({ mobileOpen, onDrawerToggle }: LeftMenuProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [role, setRole] = useState<string>('');
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const r = localStorage.getItem('role') || '';
      setRole(r);
      setMenuItems(ROLE_MENUS[r] || []);
    }
  }, []);

  const rc = ROLE_CONFIG[role] || { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#111827' }}>
      {/* ── Logo / Brand ─────────────────────────────────────────────── */}
      <Box
        sx={{
          height: 64, px: 2.5,
          display: 'flex', alignItems: 'center', gap: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 34, height: 34, borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16, color: '#fff',
            flexShrink: 0,
          }}
        >
          D
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, color: '#f1f5f9', fontSize: 15, lineHeight: 1.1, letterSpacing: '-0.3px' }}>
            dMoney
          </Typography>
          <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
            QA PRACTICE LAB
          </Typography>
        </Box>
      </Box>

      {/* ── Role badge ───────────────────────────────────────────────── */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            p: 1.5, borderRadius: '12px',
            bgcolor: rc.bg, border: `1px solid ${rc.color}25`,
          }}
        >
          <Box
            sx={{
              width: 32, height: 32, borderRadius: '8px',
              bgcolor: rc.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 14, color: '#fff', flexShrink: 0,
            }}
          >
            {role.charAt(0)}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Logged in as</Typography>
            <Typography sx={{ fontSize: 14, color: rc.color, fontWeight: 800 }}>{role}</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Navigation label ─────────────────────────────────────────── */}
      <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
        <Typography sx={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          Navigation
        </Typography>
      </Box>

      {/* ── Menu items ───────────────────────────────────────────────── */}
      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <ListItem
              key={item.name}
              component={Link}
              href={item.path}
              onClick={onDrawerToggle}
              sx={{
                cursor: 'pointer',
                borderRadius: '10px',
                mb: 0.5,
                px: 1.5,
                py: 1,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                },
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
              }}
            >
              <Box
                sx={{
                  color: isActive ? '#818cf8' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.15s',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </Box>
              <ListItemText
                primary={item.name}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#818cf8' : '#94a3b8',
                }}
              />
            </ListItem>
          );
        })}
      </List>

      {/* ── Profile quick link ───────────────────────────────────────── */}
      <Box sx={{ px: 1.5, pb: 2, borderTop: '1px solid rgba(255,255,255,0.06)', pt: 1.5 }}>
        <ListItem
          component={Link}
          href="/profile"
          onClick={onDrawerToggle}
          sx={{
            cursor: 'pointer', borderRadius: '10px', px: 1.5, py: 1,
            bgcolor: pathname === '/profile' ? 'rgba(99,102,241,0.12)' : 'transparent',
            borderLeft: pathname === '/profile' ? '3px solid #6366f1' : '3px solid transparent',
            display: 'flex', alignItems: 'center', gap: 1.5,
            textDecoration: 'none',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
          }}
        >
          <Box sx={{ color: pathname === '/profile' ? '#818cf8' : '#64748b', display: 'flex', alignItems: 'center' }}>
            <PeopleAltIcon sx={{ fontSize: 18 }} />
          </Box>
          <ListItemText
            primary="My Profile"
            primaryTypographyProps={{
              fontSize: 14,
              fontWeight: pathname === '/profile' ? 700 : 500,
              color: pathname === '/profile' ? '#818cf8' : '#94a3b8',
            }}
          />
        </ListItem>
        <Box sx={{ mt: 1.5, px: 1.5 }}>
          <Typography sx={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>
            dMoney v2.0 · QA Platform
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  const drawerSx = {
    '& .MuiDrawer-paper': {
      boxSizing: 'border-box',
      width: DRAWER_WIDTH,
      bgcolor: '#111827',
      borderRight: '1px solid rgba(255,255,255,0.07)',
    },
  };

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}
      >
        {drawer}
      </Drawer>
      {/* Desktop */}
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default LeftMenu;
