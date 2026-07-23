import { authApi } from '../api/auth.api';
import { authStorage } from '../../../core/auth/auth-storage';
import type { AuthUser } from '../types/auth.types';

export const authFacade = {
  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthUser> {
    const result = await authApi.register(input);
    authStorage.setSession(result.accessToken, result.user);
    return result.user;
  },

  async login(input: { email: string; password: string }): Promise<AuthUser> {
    const result = await authApi.login(input);
    authStorage.setSession(result.accessToken, result.user);
    return result.user;
  },

  async refreshMe(): Promise<AuthUser | null> {
    if (!authStorage.getToken()) return null;
    try {
      const user = await authApi.me();
      const token = authStorage.getToken();
      if (token) authStorage.setSession(token, user);
      return user;
    } catch {
      authStorage.clear();
      return null;
    }
  },

  logout(): void {
    authStorage.clear();
  },

  getStoredUser(): AuthUser | null {
    return authStorage.getUser();
  },

  isAuthenticated(): boolean {
    return Boolean(authStorage.getToken());
  },
};
