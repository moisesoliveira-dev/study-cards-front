import { httpClient } from '../../../core/api/http-client';
import type { AuthResponse, AuthUser } from '../types/auth.types';

export const authApi = {
  register(input: { email: string; password: string; name?: string }) {
    return httpClient.post<AuthResponse>('/auth/register', input);
  },

  login(input: { email: string; password: string }) {
    return httpClient.post<AuthResponse>('/auth/login', input);
  },

  me() {
    return httpClient.get<AuthUser>('/auth/me');
  },
};
