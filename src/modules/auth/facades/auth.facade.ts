import { authApi } from '../api/auth.api';
import { authStorage } from '../../../core/auth/auth-storage';
import type { AuthUser } from '../types/auth.types';

export const authFacade = {
  async startRegister(input: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }): Promise<{ email: string }> {
    const result = await authApi.register(input);
    return { email: result.email };
  },

  async verifyEmail(input: {
    email: string;
    code: string;
    rememberMe?: boolean;
  }): Promise<AuthUser> {
    const result = await authApi.verifyEmail({
      email: input.email,
      code: input.code,
    });
    authStorage.setSession(
      result.accessToken,
      result.user,
      input.rememberMe ?? true,
    );
    return result.user;
  },

  resendCode(email: string) {
    return authApi.resendCode({ email });
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

  forgotPassword(email: string) {
    return authApi.forgotPassword({ email });
  },

  resetPassword(input: { token: string; password: string }) {
    return authApi.resetPassword(input);
  },

  async refreshMe(): Promise<AuthUser | null> {
    if (!authStorage.getToken()) return null;
    try {
      const user = await authApi.me();
      const token = authStorage.getToken();
      if (token) {
        const persist = localStorage.getItem('sc_auth_persist') !== '0';
        authStorage.setSession(token, user, persist);
      }
      return user;
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
    const user = await authApi.updateProfile(input);
    const token = authStorage.getToken();
    if (token) {
      const persist = localStorage.getItem('sc_auth_persist') !== '0';
      authStorage.setSession(token, user, persist);
    }
    return user;
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return authApi.changePassword(input);
  },

  logout(): void {
    authStorage.clear();
  },

  getStoredUser(): AuthUser | null {
    return authStorage.getUser();
  },

  getRememberedLogin(): string {
    return authStorage.getRememberedLogin();
  },

  isAuthenticated(): boolean {
    return Boolean(authStorage.getToken());
  },
};
