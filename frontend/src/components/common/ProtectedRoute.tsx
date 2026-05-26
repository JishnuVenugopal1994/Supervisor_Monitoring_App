import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import api, { setAccessToken } from '../../services/api';
import type { AuthUser } from '../../types';

export default function ProtectedRoute() {
  const { isAuthenticated, setUser } = useAuth();
  // Start as checked only if we're already authenticated (e.g. same-session navigation).
  // On a fresh page load, authChecked = false so we attempt a silent refresh first.
  const [authChecked, setAuthChecked] = useState(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      setAuthChecked(true);
      return;
    }
    api
      .post<{ accessToken: string; user: AuthUser }>('/api/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        // No valid refresh token — redirect will happen after authChecked = true
      })
      .finally(() => setAuthChecked(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
