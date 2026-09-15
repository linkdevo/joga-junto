export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
