'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Tooltip,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface User {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  role?: string;
  status?: string;
  nid?: string;
  createdAt?: string;
  balance?: number;
  photo?: string;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_PHOTO = `${API_BASE}/user/uploads/user.jpg`;
const getPhotoUrl = (photo?: string) => photo ? `${API_BASE}/user/uploads/${photo}` : DEFAULT_PHOTO;

export default function Profile() {
  const [user, setUser] = useState<User>({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<User>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [photoSrc, setPhotoSrc] = useState<string>(DEFAULT_PHOTO);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      const email = localStorage.getItem('email');
      if (!token) { router.replace('/login'); return; }
      if (!email) { setLoading(false); return; }
      try {
        const encodedEmail = encodeURIComponent(email);
        const response = await API.get(`/user/search/email/${encodedEmail}`);
        const userData = response.data.user;
        setUser(userData);
        setFormData(userData);
        setPhotoSrc(getPhotoUrl(userData.photo));
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleEdit = () => { setFormData({ ...user }); setEditMode(true); };
  const handleCancel = () => { setFormData({ ...user }); setEditMode(false); };
  const handleChange = (field: keyof User, value: string) => setFormData({ ...formData, [field]: value });

  const handleSave = async () => {
    if (!formData.id) return;
    try {
      setSaveLoading(true);
      await API.patch(`/user/update/${formData.id}`, {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
        nid: formData.nid,
      });
      setSnackbarMessage('Profile updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setUser(formData);
      setEditMode(false);
      if (formData.email) localStorage.setItem('email', formData.email);
      if (formData.name) localStorage.setItem('name', formData.name);
    } catch (err: any) {
      setSnackbarMessage(err.response?.data?.message || 'Failed to update profile');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected after an error
    e.target.value = '';

    if (!file) return;

    // ── Client-side validation ────────────────────────────────────────────────
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setSnackbarMessage('Only JPG, JPEG or PNG images are allowed.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    if (file.size > 1024 * 1024) {
      setSnackbarMessage('Image must be smaller than 1 MB.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    if (!user.id) return;

    // ── Upload ────────────────────────────────────────────────────────────────
    try {
      setPhotoLoading(true);
      const fd = new FormData();
      fd.append('image', file);
      const response = await API.post(`/user/upload/${user.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedFilename: string = response.data.photo;
      const newUrl = getPhotoUrl(uploadedFilename);
      setPhotoSrc(newUrl);
      setUser((prev) => ({ ...prev, photo: uploadedFilename }));
      setSnackbarMessage('Photo uploaded successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: any) {
      setSnackbarMessage(err.response?.data?.message || 'Failed to upload photo.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setPhotoLoading(false);
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

  const rc = ROLE_COLORS[formData.role || ''] || { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
  const statusInfo = STATUS_MAP[formData.status || ''] || { color: 'warning' as const, label: formData.status || '' };

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

  return (
    <DashboardLayout>
      <Box>
        {/* ── Page Header ───────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          {/* Left: Photo avatar + name + role */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

            {/* ── Profile photo with camera upload overlay ─────────── */}
            <Box sx={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
              <Avatar
                src={photoSrc}
                imgProps={{
                  onError: () => setPhotoSrc(DEFAULT_PHOTO),
                  style: { objectFit: 'cover' },
                }}
                sx={{
                  width: 68, height: 68,
                  border: `2px solid ${rc.color}50`,
                  fontSize: 26, fontWeight: 800,
                  bgcolor: rc.bg, color: rc.color,
                }}
              >
                {/* Fallback initial when image fails and src is cleared */}
                {formData.name?.charAt(0).toUpperCase()}
              </Avatar>

              {/* Camera button */}
              <Tooltip title="Upload photo (JPG / PNG, max 1 MB)">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoLoading}
                  sx={{
                    position: 'absolute', bottom: -3, right: -3,
                    width: 26, height: 26,
                    bgcolor: '#6366f1', color: '#fff',
                    border: '2px solid #fff',
                    '&:hover': { bgcolor: '#4f46e5' },
                    '&:disabled': { bgcolor: 'rgba(99,102,241,0.4)' },
                  }}
                >
                  {photoLoading
                    ? <CircularProgress size={12} sx={{ color: '#fff' }} />
                    : <CameraAltIcon sx={{ fontSize: 13 }} />}
                </IconButton>
              </Tooltip>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 24, color: '#0f172a', letterSpacing: '-0.3px' }}>
                {formData.name || 'My Profile'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip
                  label={formData.role}
                  size="small"
                  sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 700, fontSize: 11, height: 22 }}
                />
                {formData.id && (
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>ID: #{formData.id}</Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Right: Account Status */}
          {formData.status && (
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
          )}
        </Box>

        {/* Status warning banner */}
        {formData.status && formData.status !== 'active' && (
          <Alert
            severity={formData.status === 'pending' ? 'warning' : 'error'}
            sx={{ mb: 3, borderRadius: '10px' }}
          >
            {formData.status === 'pending'
              ? '⏳ Your account is pending admin approval. You cannot perform transactions until your account is activated.'
              : '🚫 Your account has been suspended. Please contact admin for assistance.'}
          </Alert>
        )}

        <Divider sx={{ mb: 4 }} />

        {/* ── Form Fields (2-column grid) ────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 3,
          }}
        >
          {/* Name */}
          <TextField
            label="Full Name"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={!editMode}
            required
            sx={fieldSx}
          />

          {/* Email */}
          <TextField
            label="Email Address"
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={!editMode}
            required
            sx={fieldSx}
          />

          {/* Phone */}
          <TextField
            label="Phone Number"
            value={formData.phone_number || ''}
            onChange={(e) => handleChange('phone_number', e.target.value)}
            disabled={!editMode}
            required
            sx={fieldSx}
          />

          {/* NID */}
          <TextField
            label="National ID (NID)"
            value={formData.nid || ''}
            onChange={(e) => handleChange('nid', e.target.value)}
            disabled={!editMode}
            sx={fieldSx}
          />

          {/* Role — read-only */}
          <TextField
            label="Role"
            value={formData.role || ''}
            disabled
            InputProps={{ readOnly: true }}
            sx={fieldSx}
          />

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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 4 }}>
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
              Edit Profile
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
