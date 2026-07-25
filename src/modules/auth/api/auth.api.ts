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

  login(input: { login: string; password: string; rememberMe?: boolean }) {
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

  uploadAvatar(file: File) {
    const body = new FormData();
    body.append('file', file);
    return httpClient.postForm<AuthUser>('/auth/me/avatar', body);
  },

  removeAvatar() {
    return httpClient.delete<AuthUser>('/auth/me/avatar');
  },

  async avatarBlob(cacheKey?: string) {
    const qs = cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : '';
    return httpClient.getBlob(`/auth/me/avatar${qs}`);
  },
};
