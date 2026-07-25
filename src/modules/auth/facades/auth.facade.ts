import { authApi } from '../api/auth.api';
import { authStorage } from '../../../core/auth/auth-storage';
import type { AuthUser } from '../types/auth.types';

function isPersisted(): boolean {
  return localStorage.getItem('sc_auth_persist') !== '0';
}

function persistUser(user: AuthUser): AuthUser {
  const token = authStorage.getToken();
  if (token) authStorage.setSession(token, user, isPersisted());
  return user;
}

function normalizeUser(user: AuthUser | null): AuthUser | null {
  if (!user) return null;
  return {
    ...user,
    hasAvatar: Boolean(user.hasAvatar),
    updatedAt: user.updatedAt ?? new Date(0).toISOString(),
  };
}

export const authFacade = {
  async register(input: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }): Promise<AuthUser> {
    const result = await authApi.register(input);
    authStorage.setSession(result.accessToken, result.user, true);
    return result.user;
  },

  async login(input: {
    login: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<AuthUser> {
    const rememberMe = input.rememberMe ?? false;
    const result = await authApi.login({
      login: input.login,
      password: input.password,
      rememberMe,
    });
    authStorage.setSession(result.accessToken, result.user, rememberMe);
    if (rememberMe) {
      authStorage.setRememberedLogin(input.login.trim());
    } else {
      authStorage.setRememberedLogin(null);
    }
    return result.user;
  },

  async refreshMe(): Promise<AuthUser | null> {
    if (!authStorage.getToken()) return null;
    try {
      const user = await authApi.me();
      return persistUser(user);
    } catch {
      authStorage.clear();
      return null;
    }
  },

  async updateProfile(input: {
    name?: string;
    email?: string;
    username?: string;
  }): Promise<AuthUser> {
    return persistUser(await authApi.updateProfile(input));
  },

  async uploadAvatar(file: File): Promise<AuthUser> {
    return persistUser(await authApi.uploadAvatar(file));
  },

  async removeAvatar(): Promise<AuthUser> {
    return persistUser(await authApi.removeAvatar());
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return authApi.changePassword(input);
  },

  logout(): void {
    authStorage.clear();
  },

  getStoredUser(): AuthUser | null {
    return normalizeUser(authStorage.getUser());
  },

  getRememberedLogin(): string {
    return authStorage.getRememberedLogin();
  },

  isAuthenticated(): boolean {
    return Boolean(authStorage.getToken());
  },
};
