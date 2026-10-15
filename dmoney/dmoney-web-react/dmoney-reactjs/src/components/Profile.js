import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  CssBaseline,
} from '@mui/material';

const Profile = () => {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true); // Add a loading state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      const email = localStorage.getItem('email'); // Retrieve the email from localStorage

      // If no token, redirect to login immediately
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      if (!email) {
        console.error('No email found in localStorage');
        setLoading(false); // Stop loading if email is not found
        return;
      }

      try {
        // Call the email search API using POST
        const response = await API.post(
          '/user/search/email',
          { email } // Send the email in the request body
        );

        // Set the fetched user data to the state
        setUser(response.data.user);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false); // Stop loading after data fetch
      }
    };

    fetchProfile();
  }, [navigate]);

  // Show a loading spinner or message while data is loading
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6">Loading profile data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <CssBaseline />
      <Paper
        elevation={3}
        sx={{
          padding: 3,
          width: '80%',
          maxWidth: 600,
        }}
      >
        <Typography variant="h5" align="center" sx={{ mb: 3 }}>
          User Profile
        </Typography>
        <TableContainer>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Name
                  </Typography>
                </TableCell>
                <TableCell>{user.name || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Email
                  </Typography>
                </TableCell>
                <TableCell>{user.email || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Phone Number
                  </Typography>
                </TableCell>
                <TableCell>{user.phone_number || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Role
                  </Typography>
                </TableCell>
                <TableCell>{user.role || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Registration Date
                  </Typography>
                </TableCell>
                <TableCell>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Balance
                  </Typography>
                </TableCell>
                <TableCell>
                  {typeof user.balance === 'number' ? user.balance.toFixed(2) : '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Profile;
