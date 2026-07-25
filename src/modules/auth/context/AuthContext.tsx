import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authFacade } from '../facades/auth.facade';
import { authStorage } from '../../../core/auth/auth-storage';
import type { AuthUser } from '../types/auth.types';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  rememberedLogin: string;
  sessionExpired: boolean;
  login: (
    login: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  register: (input: {
    email: string;
    username: string;
    password: string;
    name?: string;
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
  acknowledgeExpired: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'pointermove',
] as const;
const CHECK_INTERVAL_MS = 15 * 1000;
const TOUCH_THROTTLE_MS = 30 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(
    () => authFacade.getStoredUser(),
  );
  const [loading, setLoading] = useState(true);
  const [rememberedLogin] = useState(() => authFacade.getRememberedLogin());
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authFacade.isAuthenticated()) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (authStorage.isExpired()) {
        authStorage.clear();
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
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

  const handleExpire = useCallback(() => {
    authStorage.clear();
    setUser((prev) => {
      if (prev) setSessionExpired(true);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_THROTTLE_MS) return;
      if (authStorage.isExpired()) {
        handleExpire();
        return;
      }
      lastTouchRef.current = now;
      authStorage.touch();
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    );

    const interval = window.setInterval(() => {
      if (authStorage.isExpired()) handleExpire();
    }, CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && authStorage.isExpired()) {
        handleExpire();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity),
      );
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, handleExpire]);

  const login = useCallback(
    async (loginValue: string, password: string, rememberMe = false) => {
      const next = await authFacade.login({
        login: loginValue,
        password,
        rememberMe,
      });
      setSessionExpired(false);
      lastTouchRef.current = Date.now();
      setUser(next);
    },
    [],
  );

  const register = useCallback(
    async (input: {
      email: string;
      username: string;
      password: string;
      name?: string;
    }) => {
      const next = await authFacade.register(input);
      setSessionExpired(false);
      lastTouchRef.current = Date.now();
      setUser(next);
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
    setSessionExpired(false);
    setUser(null);
  }, []);

  const acknowledgeExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      rememberedLogin,
      sessionExpired,
      login,
      register,
      updateProfile,
      changePassword,
      logout,
      acknowledgeExpired,
    }),
    [
      user,
      loading,
      rememberedLogin,
      sessionExpired,
      login,
      register,
      updateProfile,
      changePassword,
      logout,
      acknowledgeExpired,
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
