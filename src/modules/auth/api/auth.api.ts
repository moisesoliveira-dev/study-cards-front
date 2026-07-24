import { httpClient } from '../../../core/api/http-client';
import type { AuthResponse, AuthUser } from '../types/auth.types';

export const authApi = {
  register(input: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }) {
    return httpClient.post<AuthResponse>('/auth/register', input);
  },

  login(input: { login: string; password: string }) {
    return httpClient.post<AuthResponse>('/auth/login', input);
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
