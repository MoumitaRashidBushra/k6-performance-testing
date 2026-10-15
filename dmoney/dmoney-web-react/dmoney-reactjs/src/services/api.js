import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Request interceptor to add token to all requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add secret key if available
    const secretKey = process.env.REACT_APP_SECRET_KEY;
    if (secretKey) {
      config.headers['X-AUTH-SECRET-KEY'] = secretKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors (token expiration)
// 403 errors should show alert messages instead of logging out
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only auto-logout on 401 (unauthorized/token expired)
    // 403 (forbidden) should show error message instead
    if (error.response && error.response.status === 401) {
      // Token is expired or invalid
      // Clear all authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('email');
      localStorage.removeItem('userId');
      localStorage.removeItem('phoneNumber');
      localStorage.removeItem('photo');
      localStorage.removeItem('balance');
      
      // Use replace instead of href for immediate redirect without history entry
      window.location.replace('/login');
      
      // Return a promise that never resolves to prevent further execution
      return new Promise(() => {});
    }
    return Promise.reject(error);
  }
);

export default API;
