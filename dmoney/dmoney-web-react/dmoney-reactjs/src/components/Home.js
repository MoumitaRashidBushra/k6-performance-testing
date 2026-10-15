import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // User is logged in, redirect to profile
      navigate('/profile');
    } else {
      // User is not logged in, redirect to login
      navigate('/login');
    }
  }, [navigate]);

  // Show loading spinner while redirecting
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
      }}
    >
      <CircularProgress size={60} sx={{ mb: 2, color: 'primary.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
        Redirecting...
      </Typography>
    </Box>
  );
};

export default Home;
