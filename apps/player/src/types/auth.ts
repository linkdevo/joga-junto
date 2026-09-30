export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
