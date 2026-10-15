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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Paper,
  Stack,
  SelectChangeEvent,
} from '@mui/material';

export default function CreateUser() {
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

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await API.post('/user/create', formData);
      // Use the message from API response
      const successMessage = response.data?.message || 'User created successfully!';
      setSuccess(successMessage);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        nid: '',
        role: '',
      });
      
      // Redirect to user list after 2 seconds
      setTimeout(() => {
        router.push('/admin/users');
      }, 2000);
    } catch (err: any) {
      // Display the specific error message from API response
      const errorMessage = err.response?.data?.message || 'Failed to create user';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Create New User
        </Typography>

        <Paper sx={{ p: 3, mt: 3, maxWidth: 600 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                required
              />

              <TextField
                fullWidth
                label="NID"
                name="nid"
                value={formData.nid}
                onChange={handleChange}
                required
              />

              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleSelectChange}
                  label="Role"
                >
                  <MenuItem value="Admin">Admin</MenuItem>
                  <MenuItem value="Agent">Agent</MenuItem>
                  <MenuItem value="Customer">Customer</MenuItem>
                  <MenuItem value="Merchant">Merchant</MenuItem>
                </Select>
              </FormControl>

              {error && <Alert severity="error">{error}</Alert>}

              {success && <Alert severity="success">{success}</Alert>}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                >
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/admin/users')}
                  fullWidth
                >
                  Cancel
                </Button>
              </Box>
            </Stack>
          </form>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
