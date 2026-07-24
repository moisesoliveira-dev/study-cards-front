export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};
