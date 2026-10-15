import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// ── Helper: decode JWT payload and check exp claim ───────────────────────────
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true; // unparseable token → treat as expired
  }
}

// ── Shared logout helper ──────────────────────────────────────────────────────
export function clearSessionAndRedirect() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('email');
  localStorage.removeItem('userId');
  localStorage.removeItem('phoneNumber');
  localStorage.removeItem('photo');
  localStorage.removeItem('balance');
  document.cookie = 'token=; path=/; max-age=0';
  window.location.replace('/login');
}

// Request interceptor — proactively check token expiry BEFORE every request
API.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');

      // ── Proactive expiry check ─────────────────────────────────────────────
      if (token && isTokenExpired(token)) {
        clearSessionAndRedirect();
        // Cancel the outgoing request — the page is being redirected anyway
        return Promise.reject(new axios.Cancel('Session expired'));
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Add secret key if available
      const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
      if (secretKey) {
        config.headers['X-AUTH-SECRET-KEY'] = secretKey;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors (token expiration)
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only auto-logout on 401 (unauthorized/token expired)
    // 403 (forbidden) should show error message instead
    if (error.response && error.response.status === 401) {
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

export default API;
