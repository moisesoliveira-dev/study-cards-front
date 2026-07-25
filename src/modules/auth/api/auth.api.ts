import { httpClient } from '../../../core/api/http-client';
import type { AuthResponse, AuthUser } from '../types/auth.types';

export const authApi = {
  register(input: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }) {
    return httpClient.post<{ ok: boolean; email: string }>(
      '/auth/register',
      input,
    );
  },

  verifyEmail(input: { email: string; code: string }) {
    return httpClient.post<AuthResponse>('/auth/verify-email', input);
  },

  resendCode(input: { email: string }) {
    return httpClient.post<{ ok: boolean }>('/auth/resend-code', input);
  },

  login(input: { login: string; password: string; rememberMe?: boolean }) {
    return httpClient.post<AuthResponse>('/auth/login', input);
  },

  forgotPassword(input: { email: string }) {
    return httpClient.post<{ ok: boolean }>('/auth/forgot-password', input);
  },

  resetPassword(input: { token: string; password: string }) {
    return httpClient.post<{ ok: boolean }>('/auth/reset-password', input);
  },

  me() {
    return httpClient.get<AuthUser>('/auth/me');
  },

  updateProfile(input: { name?: string; email?: string; username?: string }) {
    return httpClient.patch<AuthUser>('/auth/me', input);
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return httpClient.post<{ ok: boolean }>('/auth/change-password', input);
  },
};
