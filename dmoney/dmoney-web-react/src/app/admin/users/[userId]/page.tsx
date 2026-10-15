'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import API from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Divider,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface UserData {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  nid: string;
  role: string;
  status?: string;
  balance?: number;
  createdAt?: string;
}

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  Admin:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  Agent:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Customer: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Merchant: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
};

const STATUS_MAP: Record<string, { color: 'success' | 'warning' | 'error'; label: string }> = {
  active:    { color: 'success', label: 'Active' },
  pending:   { color: 'warning', label: 'Pending' },
  suspended: { color: 'error',   label: 'Suspended' },
};

export default function UserProfile() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UserData | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    if (userId) fetchUserProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, router]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/user/search/id/${userId}`);
      setUser(response.data.user);
      setFormData(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => { setFormData({ ...user! }); setEditMode(true); };
  const handleCancel = () => { setFormData({ ...user! }); setEditMode(false); };
  const handleChange = (field: keyof UserData, value: string) => {
    if (formData) setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    if (!formData) return;
    try {
      setSaveLoading(true);
      await API.patch(`/user/update/${userId}`, {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
        nid: formData.nid,
        role: formData.role,
        status: formData.status,
      });
      setSnackbarMessage('User updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setUser(formData);
      setEditMode(false);
      fetchUserProfile();
    } catch (err: any) {
      setSnackbarMessage(err.response?.data?.message || 'Failed to update user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (error || !user || !formData) {
    return (
      <DashboardLayout>
        <Box>
          <Alert severity={error ? 'error' : 'warning'} sx={{ borderRadius: '10px' }}>
            {error || 'User not found'}
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/users')}
            sx={{ mt: 2, textTransform: 'none', borderRadius: '10px' }}
          >
            Back to User List
          </Button>
        </Box>
      </DashboardLayout>
    );
  }

  const rc = ROLE_COLORS[formData.role || ''] || { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
  const statusInfo = STATUS_MAP[formData.status || ''] || { color: 'warning' as const, label: formData.status || 'Unknown' };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: editMode ? '#f8fafc' : 'transparent',
      borderRadius: '10px',
      transition: 'background-color 0.2s',
      '& fieldset': { borderColor: editMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)' },
      '&:hover fieldset': { borderColor: editMode ? 'rgba(99,102,241,0.5)' : 'rgba(0,0,0,0.1)' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
      '&.Mui-disabled': { bgcolor: 'transparent' },
      '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.08)' },
    },
    '& .MuiInputLabel-root': { color: '#64748b' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
    '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#334155', color: '#334155' },
  };

  const selectSx = {
    bgcolor: editMode ? '#f8fafc' : 'transparent',
    borderRadius: '10px',
    '& fieldset': { borderColor: editMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)' },
    '&:hover fieldset': { borderColor: editMode ? 'rgba(99,102,241,0.5)' : 'rgba(0,0,0,0.1)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    '&.Mui-disabled': { bgcolor: 'transparent' },
    '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.08)' },
  };

  return (
    <DashboardLayout>
      <Box>
        {/* ── Page Header ───────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          {/* Left: Avatar + name + role + ID */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 60, height: 60, fontSize: 26, fontWeight: 800,
                bgcolor: rc.bg, color: rc.color,
                border: `2px solid ${rc.color}40`,
              }}
            >
              {formData.name ? formData.name.charAt(0).toUpperCase() : <PersonIcon />}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 24, color: '#0f172a', letterSpacing: '-0.3px' }}>
                {formData.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip
                  label={formData.role}
                  size="small"
                  sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 700, fontSize: 11, height: 22 }}
                />
                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>ID: #{formData.id}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Right: Account Status chip */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
              Account Status
            </Typography>
            <Chip
              label={statusInfo.label.toUpperCase()}
              color={statusInfo.color}
              variant="filled"
              size="medium"
              sx={{ fontWeight: 700, fontSize: 12, px: 0.5 }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* ── Form Fields (2-column grid) ────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 3,
          }}
        >
          {/* ID — always read-only */}
          <TextField
            label="User ID"
            value={formData.id}
            disabled
            InputProps={{ readOnly: true }}
            sx={fieldSx}
          />

          {/* Name */}
          <TextField
            label="Full Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={!editMode}
            required
            sx={fieldSx}
          />

          {/* Email */}
          <TextField
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={!editMode}
            required
            sx={fieldSx}
          />

          {/* Phone */}
          <TextField
            label="Phone Number"
            value={formData.phone_number}
            onChange={(e) => handleChange('phone_number', e.target.value)}
            disabled={!editMode}
            required
            sx={fieldSx}
          />

          {/* NID */}
          <TextField
            label="National ID (NID)"
            value={formData.nid}
            onChange={(e) => handleChange('nid', e.target.value)}
            disabled={!editMode}
            sx={fieldSx}
          />

          {/* Role — admin editable */}
          <FormControl sx={{ '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' } }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              disabled={!editMode}
              label="Role"
              sx={selectSx}
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Agent">Agent</MenuItem>
              <MenuItem value="Customer">Customer</MenuItem>
              <MenuItem value="Merchant">Merchant</MenuItem>
            </Select>
          </FormControl>

          {/* Account Status — admin editable */}
          <FormControl sx={{ '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' } }}>
            <InputLabel>Account Status</InputLabel>
            <Select
              value={formData.status || 'pending'}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={!editMode}
              label="Account Status"
              sx={selectSx}
            >
              <MenuItem value="pending">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                  Pending
                </Box>
              </MenuItem>
              <MenuItem value="active">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  Active
                </Box>
              </MenuItem>
              <MenuItem value="suspended">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                  Suspended
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Balance — read-only */}
          {typeof formData.balance === 'number' && (
            <TextField
              label="Current Balance (BDT)"
              value={formData.balance.toFixed(2)}
              disabled
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          )}

          {/* Registered Date — read-only */}
          {formData.createdAt && (
            <TextField
              label="Registered On"
              value={new Date(formData.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
              disabled
              InputProps={{ readOnly: true }}
              sx={fieldSx}
            />
          )}
        </Box>

        {/* ── Action Buttons — bottom right ─────────────────────────── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, flexWrap: 'wrap', gap: 2 }}>
          {/* Back button — always visible */}
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/users')}
            disabled={saveLoading}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '10px', px: 2.5, height: 42 }}
          >
            Back to User List
          </Button>

          {/* Edit / Save+Cancel */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {!editMode ? (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                sx={{
                  fontWeight: 700, textTransform: 'none', borderRadius: '10px',
                  px: 3, height: 42,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  '&:hover': { background: 'linear-gradient(135deg, #818cf8, #6366f1)' },
                }}
              >
                Edit User
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={saveLoading}
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '10px', px: 3, height: 42 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={saveLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saveLoading}
                  sx={{
                    fontWeight: 700, textTransform: 'none', borderRadius: '10px',
                    px: 3, height: 42,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    '&:hover': { background: 'linear-gradient(135deg, #34d399, #10b981)' },
                    '&:disabled': { background: 'rgba(16,185,129,0.3)', color: 'rgba(255,255,255,0.5)' },
                  }}
                >
                  {saveLoading ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
