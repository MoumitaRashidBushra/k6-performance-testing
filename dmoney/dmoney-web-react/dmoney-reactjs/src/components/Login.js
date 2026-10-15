import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  CssBaseline,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // To display login errors
  const [validationError, setValidationError] = useState(''); // To display validation errors
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    setValidationError(''); // Clear validation errors

    // Front-end validation for empty fields
    if (!email || !password) {
      setValidationError('Email and Password cannot be empty.');
      return;
    }

    setLoading(true); // Set loading state to true

    try {
      // Step 1: Authenticate user
      const loginResponse = await axios.post(
        `${process.env.REACT_APP_API_URL}/user/login`,
        { email, password }
      );

      const token = loginResponse.data.token;

      // Step 2: Fetch user details using email
      const emailSearchResponse = await axios.post(
        `${process.env.REACT_APP_API_URL}/user/search/email`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-AUTH-SECRET-KEY': process.env.REACT_APP_SECRET_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const user = emailSearchResponse.data.user;

      // Step 3: Store token and user details in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role); // Store role
      localStorage.setItem('email', user.email); // Store email
      localStorage.setItem('userId', user.id); // Store user ID
      localStorage.setItem('phoneNumber', user.phone_number); // Store phone number
      localStorage.setItem('photo', user.photo || ''); // Store photo (fallback to empty string)
      localStorage.setItem('balance', user.balance); // Store balance

      // Navigate to dashboard
      navigate('/profile');
    } catch (err) {
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 400)
      ) {
        setError('Login failed. Please input correct email or password.');
      } else {
        setError(
          'Please go to your browser site settings, then allow insecure content, reload your website and login again.'
        );
      }
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Box sx={{ marginBottom: 4 }}>
          <img
            src="/logo.png" // Access logo.png directly from the public folder
            alt="Logo"
            style={{ width: '100px', height: '100px' }}
          />
        </Box>

        {/* Paper container for better styling */}
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ marginBottom: 2 }}>
            D-Money Login
          </Typography>
          {validationError && (
            <Alert severity="warning" sx={{ marginBottom: 2 }}>
              {validationError}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleLogin} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ marginBottom: 2 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                marginTop: 2,
                height: 48,
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={16} sx={{ color: '#fff', marginRight: 1 }} />
                  Please wait...verifying your credentials
                </>
              ) : (
                'Login'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
