import { create } from 'zustand';
import api, { setAccessToken, getErrorMessage } from '../services/api';
import { AuthUser } from '../types';

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: async (username, password) => {
    const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/api/auth/login', {
      username,
      password,
    });
    setAccessToken(data.accessToken);
    set({ user: data.user, isAuthenticated: true });
  },
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false });
    }
  },
}));

export function useAuth() {
  const { user, isAuthenticated, login, logout, setUser } = useAuthStore();
  const isSupervisor = user?.role === 'SUPERVISOR';
  return { user, isAuthenticated, isSupervisor, login, logout, setUser };
}

export { getErrorMessage };
