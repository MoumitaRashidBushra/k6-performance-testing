import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, AppBar, Toolbar, Typography, Menu, MenuItem, IconButton, Avatar } from '@mui/material';
import LeftMenu from './LeftMenu'; // Import the LeftMenu component

const AdminDashboard = () => {
  const [anchorEl, setAnchorEl] = React.useState(null); // State for profile menu
  const navigate = useNavigate();

  // Handle Profile Menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.clear(); // Clear local storage
    navigate('/'); // Redirect to login page
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <LeftMenu /> {/* Include the role-based LeftMenu */}
      <Box
        sx={{
          flexGrow: 1, // Allow the main content to grow and fill the space
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', // Center horizontally
        }}
      >
        {/* Header */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {localStorage.getItem("role")} Dashboard
            </Typography>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
              <Avatar alt="User Profile" src="/static/images/avatar/1.jpg" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box
          sx={{
            flexGrow: 1,
            marginTop: '64px', // Space for the AppBar
            display: 'flex',
            justifyContent: 'center', // Center horizontally
            padding: 2,
            width: '100%',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: '1200px', // Restrict maximum width for better alignment
              textAlign: 'center',
            }}
          >
            <Outlet /> {/* Render child routes */}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
