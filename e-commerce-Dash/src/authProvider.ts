import { AuthProvider } from 'react-admin';
import {
  setAccessToken,
  setRefreshToken,
  setRole,
  setUserId,
  setUserName,
  setUserEmail,
  clearAuth,
  refreshAccessToken,
} from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3007/v1';

const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const doLogin = async () => {
      return fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });
    };

    let res: Response;
    try {
      res = await doLogin();
    } catch {
      // Retry once after a short delay on network error/server wake-up
      await new Promise(r => setTimeout(r, 1000));
      res = await doLogin();
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      // If 500 error due to database connection timeout or cold start, retry once
      if (
        res.status >= 500 &&
        typeof err.message === 'string' &&
        (err.message.includes('timed out') || err.message.includes('timeout') || err.message.includes('connectTimeoutMS'))
      ) {
        await new Promise(r => setTimeout(r, 1500));
        const retryRes = await doLogin();
        if (retryRes.ok) {
          const json = await retryRes.json();
          const { accessToken, refreshToken, role, user } = json.data;

          if (!['admin', 'superAdmin'].includes(role)) {
            throw new Error('Access denied. Admin privileges required.');
          }

          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
          setRole(role);
          setUserId(user?._id || '');
          setUserName(user?.name || '');
          setUserEmail(user?.email || '');
          return Promise.resolve();
        }
      }
      throw new Error(err.message || 'Login failed');
    }

    const json = await res.json();
    const { accessToken, refreshToken, role, user } = json.data;

    if (!['admin', 'superAdmin'].includes(role)) {
      throw new Error('Access denied. Admin privileges required.');
    }

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setRole(role);
    setUserId(user?._id || '');
    setUserName(user?.name || '');
    setUserEmail(user?.email || '');

    return Promise.resolve();
  },

  logout: () => {
    clearAuth();
    return Promise.resolve();
  },

  checkError: async ({ status }: { status: number }) => {
    if (status === 401 || status === 403) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return Promise.resolve();
      clearAuth();
      return Promise.reject();
    }
    return Promise.resolve();
  },

  checkAuth: () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    return token && role ? Promise.resolve() : Promise.reject();
  },

  getPermissions: () => {
    const role = localStorage.getItem('user_role') || '';
    return Promise.resolve(role);
  },

  getIdentity: () => {
    const fullName = localStorage.getItem('full_name') || 'Admin';
    const email = localStorage.getItem('email') || '';
    const userId = localStorage.getItem('user_id') || '';
    return Promise.resolve({
      id: userId,
      fullName,
      email,
      avatar: undefined,
    });
  },
};

export default authProvider;
