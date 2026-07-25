import type { AuthUser } from '../../modules/auth/types/auth.types';

const TOKEN_KEY = 'sc_access_token';
const USER_KEY = 'sc_auth_user';
const REMEMBER_LOGIN_KEY = 'sc_remember_login';
const PERSIST_FLAG = 'sc_auth_persist';

function store(): Storage {
  try {
    if (localStorage.getItem(PERSIST_FLAG) === '0') {
      return sessionStorage;
    }
  } catch {
    /* ignore */
  }
  return localStorage;
}

function readToken(): string | null {
  return (
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  );
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

  /** Prefer store() only for debug; prefer explicit APIs above. */
  _activeStore: store,
};
