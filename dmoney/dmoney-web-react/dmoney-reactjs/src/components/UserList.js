import React, { useEffect, useState } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import Pagination from './Pagination'; // Reuse the existing Pagination component

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchType, setSearchType] = useState('list'); // 'list', 'id', 'phonenumber', 'email', 'role'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch users from backend with pagination
  const fetchUsers = async (page = 1, count = 10) => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        count,
      };

      const response = await API.get(
        '/user/list',
        {
          params,
        }
      );

      setUsers(response.data.users || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching user list:', error);
      setError('Error fetching user list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Search users based on selected type
  const searchUsers = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError('');
    
    try {
      let url = '';
      
      switch (searchType) {
        case 'id':
          if (!searchQuery || isNaN(searchQuery)) {
            setError('Please enter a valid user ID');
            setLoading(false);
            return;
          }
          url = `${process.env.REACT_APP_API_URL}/user/search/id/${searchQuery}`;
          break;
          
        case 'phonenumber':
          if (!searchQuery) {
            setError('Please enter a phone number');
            setLoading(false);
            return;
          }
          url = `${process.env.REACT_APP_API_URL}/user/search/phonenumber/${searchQuery}`;
          break;
          
        case 'email':
          if (!searchQuery) {
            setError('Please enter an email address');
            setLoading(false);
            return;
          }
          url = `${process.env.REACT_APP_API_URL}/user/search/email/${searchQuery}`;
          break;
          
        case 'role':
          if (!searchQuery) {
            setError('Please enter a role (e.g., Customer, Agent, Merchant)');
            setLoading(false);
            return;
          }
          url = `${process.env.REACT_APP_API_URL}/user/search/${searchQuery.toLowerCase()}`;
          break;
          
        default:
          fetchUsers(currentPage, rowsPerPage);
          return;
      }

      const response = await API.get(url);

      // Handle response - could be a single user or array
      if (Array.isArray(response.data)) {
        setUsers(response.data);
        setTotal(response.data.length);
      } else if (response.data.user) {
        setUsers([response.data.user]);
        setTotal(1);
      } else if (response.data.users) {
        setUsers(response.data.users);
        setTotal(response.data.users.length);
      } else {
        setUsers([response.data]);
        setTotal(1);
      }
      
      setCurrentPage(1);
    } catch (error) {
      console.error('Error searching users:', error);
      if (error.response?.status === 404) {
        setError('No user found with the provided search criteria');
        setUsers([]);
        setTotal(0);
      } else {
        setError('Error searching users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'list') {
      fetchUsers(currentPage, rowsPerPage);
    } else {
      searchUsers();
    }
  };

  const handleReset = () => {
    setSearchType('list');
    setSearchQuery('');
    setCurrentPage(1);
    setError('');
    fetchUsers(1, rowsPerPage);
  };

  useEffect(() => {
    fetchUsers(currentPage, rowsPerPage);
    // eslint-disable-next-line
  }, [currentPage, rowsPerPage]);

  const handleViewProfile = (id) => {
    navigate(`/admin/user-profile/${id}`);
  };

  if (loading) {
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
        <CircularProgress size={80} sx={{ mb: 2, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Please wait... fetching data
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 4, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
        User List ({total})
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Search Type</InputLabel>
          <Select
            value={searchType}
            label="Search Type"
            onChange={(e) => {
              setSearchType(e.target.value);
              setSearchQuery('');
              setError('');
            }}
          >
            <MenuItem value="list">All Users (List)</MenuItem>
            <MenuItem value="id">Search by ID</MenuItem>
            <MenuItem value="phonenumber">Search by Phone Number</MenuItem>
            <MenuItem value="email">Search by Email</MenuItem>
            <MenuItem value="role">Search by Role</MenuItem>
          </Select>
        </FormControl>

        {searchType !== 'list' && (
          <TextField
            label={
              searchType === 'id' 
                ? 'Enter User ID' 
                : searchType === 'phonenumber' 
                ? 'Enter Phone Number' 
                : searchType === 'email'
                ? 'Enter Email'
                : 'Enter Role'
            }
            fullWidth
            sx={{ flex: 2 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchType === 'id' 
                ? 'e.g., 123' 
                : searchType === 'phonenumber' 
                ? 'e.g., 01686606902' 
                : searchType === 'email'
                ? 'e.g., user@example.com'
                : 'e.g., Customer, Agent, Merchant'
            }
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        )}

        <Button 
          variant="contained" 
          onClick={handleSearch}
          disabled={loading}
        >
          Search
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={handleReset}
          disabled={loading}
        >
          Reset
        </Button>
      </Box>
      <Paper elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Id</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Phone Number</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Registration Date</strong></TableCell>
              <TableCell><strong>View</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone_number}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="contained" onClick={() => handleViewProfile(user.id)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Pagination
        total={total}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1);
        }}
      />
    </Box>
  );
};

export default UserList;
