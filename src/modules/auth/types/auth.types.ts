export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  hasAvatar: boolean;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};
