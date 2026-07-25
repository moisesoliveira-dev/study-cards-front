import type { AuthUser } from '../../modules/auth/types/auth.types';

const TOKEN_KEY = 'sc_access_token';
const USER_KEY = 'sc_auth_user';
const REMEMBER_LOGIN_KEY = 'sc_remember_login';
const PERSIST_FLAG = 'sc_auth_persist';
const EXPIRY_KEY = 'sc_session_expiry';

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hora sem "lembrar"
const REMEMBER_MS = 2 * 24 * 60 * 60 * 1000; // 2 dias com "lembrar"

function isRemembered(): boolean {
  return localStorage.getItem(PERSIST_FLAG) !== '0';
}

function windowMs(rememberMe: boolean): number {
  return rememberMe ? REMEMBER_MS : INACTIVITY_MS;
}

function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

function readUserRaw(): string | null {
  return localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
}

export const authStorage = {
  getToken(): string | null {
    return readToken();
  },

  setSession(token: string, user: AuthUser, rememberMe = true): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    localStorage.setItem(PERSIST_FLAG, rememberMe ? '1' : '0');
    const target = rememberMe ? localStorage : sessionStorage;
    target.setItem(TOKEN_KEY, token);
    target.setItem(USER_KEY, JSON.stringify(user));

    this.touch(rememberMe);
  },

  getUser(): AuthUser | null {
    const raw = readUserRaw();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERSIST_FLAG);
    localStorage.removeItem(EXPIRY_KEY);
  },

  /** Renews the sliding expiry window based on the remember flag. */
  touch(rememberMe?: boolean): void {
    if (!readToken()) return;
    const remember = rememberMe ?? isRemembered();
    const expiry = Date.now() + windowMs(remember);
    localStorage.setItem(EXPIRY_KEY, String(expiry));
  },

  getExpiry(): number | null {
    const raw = localStorage.getItem(EXPIRY_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  },

  isExpired(): boolean {
    if (!readToken()) return false;
    const expiry = this.getExpiry();
    if (expiry === null) return false;
    return Date.now() > expiry;
  },

  getRememberedLogin(): string {
    return localStorage.getItem(REMEMBER_LOGIN_KEY) ?? '';
  },

  setRememberedLogin(login: string | null): void {
    if (!login) {
      localStorage.removeItem(REMEMBER_LOGIN_KEY);
      return;
    }
    localStorage.setItem(REMEMBER_LOGIN_KEY, login);
  },
};
