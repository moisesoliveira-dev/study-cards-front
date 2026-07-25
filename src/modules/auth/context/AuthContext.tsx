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
  rememberedLogin: string;
  login: (
    login: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  startRegister: (input: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }) => Promise<{ email: string }>;
  verifyEmail: (input: {
    email: string;
    code: string;
    rememberMe?: boolean;
  }) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (input: {
    token: string;
    password: string;
  }) => Promise<void>;
  updateProfile: (input: {
    name?: string;
    email?: string;
    username?: string;
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
  const [rememberedLogin] = useState(() => authFacade.getRememberedLogin());

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

  const login = useCallback(
    async (loginValue: string, password: string, rememberMe = false) => {
      const next = await authFacade.login({
        login: loginValue,
        password,
        rememberMe,
      });
      setUser(next);
    },
    [],
  );

  const startRegister = useCallback(
    async (input: {
      email: string;
      username: string;
      password: string;
      name?: string;
    }) => authFacade.startRegister(input),
    [],
  );

  const verifyEmail = useCallback(
    async (input: { email: string; code: string; rememberMe?: boolean }) => {
      const next = await authFacade.verifyEmail(input);
      setUser(next);
    },
    [],
  );

  const resendCode = useCallback(async (email: string) => {
    await authFacade.resendCode(email);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authFacade.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(
    async (input: { token: string; password: string }) => {
      await authFacade.resetPassword(input);
    },
    [],
  );

  const updateProfile = useCallback(
    async (input: { name?: string; email?: string; username?: string }) => {
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
      rememberedLogin,
      login,
      startRegister,
      verifyEmail,
      resendCode,
      forgotPassword,
      resetPassword,
      updateProfile,
      changePassword,
      logout,
    }),
    [
      user,
      loading,
      rememberedLogin,
      login,
      startRegister,
      verifyEmail,
      resendCode,
      forgotPassword,
      resetPassword,
      updateProfile,
      changePassword,
      logout,
    ],
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
