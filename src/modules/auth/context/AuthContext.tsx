import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authFacade } from '../facades/auth.facade';
import type { AuthUser } from '../types/auth.types';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<void>;
  updateProfile: (input: {
    name?: string;
    email?: string;
  }) => Promise<AuthUser>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(
    () => authFacade.getStoredUser(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authFacade.isAuthenticated()) {
        if (!cancelled) setLoading(false);
        return;
      }
      const me = await authFacade.refreshMe();
      if (!cancelled) {
        setUser(me);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authFacade.login({ email, password });
    setUser(next);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const next = await authFacade.register(input);
      setUser(next);
    },
    [],
  );

  const updateProfile = useCallback(
    async (input: { name?: string; email?: string }) => {
      const next = await authFacade.updateProfile(input);
      setUser(next);
      return next;
    },
    [],
  );

  const changePassword = useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      await authFacade.changePassword(input);
    },
    [],
  );

  const logout = useCallback(() => {
    authFacade.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      updateProfile,
      changePassword,
      logout,
    }),
    [user, loading, login, register, updateProfile, changePassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
