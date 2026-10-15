'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  InputAdornment,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface Transaction {
  id: number;
  from_account: string;
  to_account: string;
  description: string;
  trnxId: string;
  debit: number;
  credit: number;
  createdAt: string;
  runningBalance?: number;
}

interface UserInfo {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  role: string;
  status: string;
  balance: number;
}

const headerCellSx = {
  fontWeight: 700,
  color: '#fff',
  backgroundColor: '#1a237e',
  fontSize: '0.85rem',
  whiteSpace: 'nowrap' as const,
  borderRight: '1px solid rgba(255,255,255,0.12)',
  '&:last-child': { borderRight: 'none' },
};

const ROLE_COLOR: Record<string, string> = {
  Admin: '#ef4444',
  Agent: '#f59e0b',
  Customer: '#10b981',
  Merchant: '#6366f1',
};

const ROWS_PER_PAGE = 20;

export default function AdminTransactions() {
  const router = useRouter();

  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // 0-indexed for MUI
  const [searched, setSearched] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');

  // Date filter state
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const fetchStatement = async (phone: string, pageNum: number) => {
    setLoading(true);
    try {
      const stmtRes = await API.get(`/transaction/statement/${encodeURIComponent(phone)}`, {
        params: { page: pageNum + 1, count: ROWS_PER_PAGE }, // API is 1-indexed
      });
      setTransactions(stmtRes.data.transactions || []);
      setTotalCount(stmtRes.data.total || 0);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error fetching transactions.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_e: unknown, newPage: number) => {
    setPage(newPage);
    fetchStatement(currentPhone, newPage);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = searchPhone.trim();
    if (!phone) return;

    setError('');
    setUserInfo(null);
    setTransactions([]);
    setTotalCount(0);
    setPage(0);
    setCurrentPhone(phone);
    setLoading(true);
    setSearched(true);

    try {
      // Fetch user info and statement in parallel
      const [userRes, stmtRes] = await Promise.all([
        API.get(`/user/search/phonenumber/${encodeURIComponent(phone)}`),
        API.get(`/transaction/statement/${encodeURIComponent(phone)}`, {
          params: { page: 1, count: ROWS_PER_PAGE },
        }),
      ]);

      setUserInfo(userRes.data.user || null);
      setTransactions(stmtRes.data.transactions || []);
      setTotalCount(stmtRes.data.total || 0);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Account not found or an error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Date range filter (applied client-side on current page) ───────────────
  const filteredTransactions = transactions.filter((t) => {
    if (!fromDate && !toDate) return true;
    const d = new Date(t.createdAt);
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  });

  // ── Running balance ───────────────────────────────────────────────────────
  const transactionsWithBalance = (() => {
    let prevBalance = 0;
    if (fromDate) {
      const filterStart = new Date(fromDate);
      filterStart.setHours(0, 0, 0, 0);
      [...transactions]
        .reverse()
        .filter((t) => new Date(t.createdAt) < filterStart)
        .forEach((t) => {
          if (t.credit) prevBalance += t.credit;
          if (t.debit) prevBalance -= t.debit;
        });
    }
    let balance = prevBalance;
    return [...filteredTransactions].reverse().map((t) => {
      if (t.credit) balance += t.credit;
      if (t.debit) balance -= t.debit;
      return { ...t, runningBalance: balance };
    });
  })();

  const roleColor = userInfo ? (ROLE_COLOR[userInfo.role] || '#6366f1') : '#6366f1';

  return (
    <DashboardLayout>
      <Box>
        {/* ── Page header ──────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box
            sx={{
              width: 52, height: 52, borderRadius: '14px',
              bgcolor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6366f1', flexShrink: 0,
            }}
          >
            <ReceiptLongIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#1e293b', letterSpacing: '-0.3px' }}>
              Transaction Lookup
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: 14 }}>
              Search any account's statement by phone number
            </Typography>
          </Box>
        </Box>

        {/* ── Search form ──────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: 3, mb: 3, borderRadius: '18px',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Box sx={{ flex: '1 1 260px', minWidth: '220px' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Account Phone Number
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="e.g. 01686606901"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: '0 0 auto' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !searchPhone.trim()}
                sx={{
                  height: 40, px: 3, fontWeight: 700, textTransform: 'none',
                  borderRadius: '10px', fontSize: 14,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
                  '&:disabled': { background: 'rgba(99,102,241,0.3)' },
                }}
              >
                {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Search →'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>{error}</Alert>}

        {/* ── User info card ───────────────────────────────────────────── */}
        {userInfo && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5, mb: 3, borderRadius: '16px',
              border: `1px solid ${roleColor}30`,
              bgcolor: `${roleColor}08`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: '12px',
                  bgcolor: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0,
                }}
              >
                {userInfo.name.charAt(0).toUpperCase()}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{userInfo.name}</Typography>
                <Typography sx={{ fontSize: 13, color: '#64748b' }}>{userInfo.email}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  label={userInfo.role}
                  size="small"
                  sx={{ bgcolor: `${roleColor}20`, color: roleColor, fontWeight: 700, fontSize: 12 }}
                />
                <Chip
                  label={userInfo.status}
                  size="small"
                  sx={{
                    bgcolor: userInfo.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: userInfo.status === 'active' ? '#059669' : '#dc2626',
                    fontWeight: 700, fontSize: 12,
                  }}
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Balance</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>
                    ৳ {(userInfo.balance || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* ── Date filter ──────────────────────────────────────────────── */}
        {searched && !loading && !error && (
          <Paper
            elevation={0}
            sx={{ p: 2.5, mb: 3, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: '160px' }}>
                <TextField
                  label="From Date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: '160px' }}>
                <TextField
                  label="To Date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  fullWidth size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => { setFromDate(''); setToDate(''); }}
                sx={{ height: 40, textTransform: 'none', fontWeight: 600 }}
              >
                Clear Filter
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => { setFromDate(getTodayDate()); setToDate(getTodayDate()); }}
                sx={{ height: 40, textTransform: 'none', fontWeight: 600 }}
              >
                Today
              </Button>
            </Box>
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
              Showing <strong>{transactionsWithBalance.length}</strong> of <strong>{totalCount}</strong> total transaction(s)
              {fromDate || toDate ? ` · filtered ${fromDate || '…'} → ${toDate || '…'}` : ' · all dates'}
            </Typography>
          </Paper>
        )}

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!loading && searched && !error && transactions.length === 0 && (
          <Paper
            elevation={0}
            sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <ReceiptLongIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
            <Typography sx={{ color: '#64748b', fontWeight: 600 }}>No transactions found for this account.</Typography>
          </Paper>
        )}

        {/* ── Initial prompt ───────────────────────────────────────────── */}
        {!loading && !searched && (
          <Paper
            elevation={0}
            sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.12)' }}
          >
            <AccountCircleIcon sx={{ fontSize: 52, color: '#cbd5e1', mb: 2 }} />
            <Typography sx={{ color: '#94a3b8', fontWeight: 600, fontSize: 15 }}>
              Enter a phone number above to view any user's transaction statement.
            </Typography>
          </Paper>
        )}

        {/* ── Transactions table ───────────────────────────────────────── */}
        {!loading && (searched && !error) && (
          <TableContainer
            component={Paper}
            elevation={3}
            sx={{ borderRadius: 2, overflow: 'hidden' }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Transaction ID</TableCell>
                  <TableCell sx={headerCellSx}>Sender Account</TableCell>
                  <TableCell sx={headerCellSx}>Receiver Account</TableCell>
                  <TableCell sx={headerCellSx}>Type</TableCell>
                  <TableCell sx={{ ...headerCellSx, color: '#ffb74d' }}>Debit</TableCell>
                  <TableCell sx={{ ...headerCellSx, color: '#81c784' }}>Credit</TableCell>
                  <TableCell sx={headerCellSx}>Balance</TableCell>
                  <TableCell sx={headerCellSx}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactionsWithBalance.map((t, index) => (
                  <TableRow
                    key={`${t.id}-${index}`}
                    sx={{
                      backgroundColor: index % 2 === 0 ? '#f9faff' : '#ffffff',
                      '&:hover': { backgroundColor: '#e8eaf6' },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#6366f1' }}>
                      {t.trnxId}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{t.from_account}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{t.to_account}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.description || 'N/A'}
                        size="small"
                        sx={{
                          backgroundColor: '#e8eaf6',
                          color: '#1a237e',
                          fontWeight: 600,
                          fontSize: '0.72rem',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: t.debit ? '#c62828' : 'text.disabled', fontWeight: t.debit ? 600 : 400 }}>
                      {t.debit ? t.debit.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell sx={{ color: t.credit ? '#2e7d32' : 'text.disabled', fontWeight: t.credit ? 600 : 400 }}>
                      {t.credit ? t.credit.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} fontSize="0.875rem">
                        {t.runningBalance?.toFixed(2) || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'text.secondary' }}>
                      {formatDate(t.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalCount > ROWS_PER_PAGE && (
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={ROWS_PER_PAGE}
                rowsPerPageOptions={[ROWS_PER_PAGE]}
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: '#f5f5f5',
                }}
              />
            )}
          </TableContainer>
        )}
      </Box>
    </DashboardLayout>
  );
}
