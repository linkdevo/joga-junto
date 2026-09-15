export type AdminRole = "COMPLEX_ADMIN";

export type Address = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

export type AdminUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: AdminRole;
  complexId: string;
};

export type AdminComplex = {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  phone: string | null;
  whatsapp: string | null;
  address: Address;
  isActive: boolean;
};

export type AdminCourt = {
  id: string;

  complexId: string;
  complexSlug: string;

  slug: string;
  name: string;
  type: string;
  surface: string;
  location: string;

  priceInCents: number;
  players: number;

  highlight: string;
  description: string;
  imageUrl: string;

  times: string[];

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
};

/**
 * Alias utilizado nas telas que não precisam
 * diferenciar Court de AdminCourt.
 */
export type Court = AdminCourt;

export type AdminSession = {
  token: string;
  admin: AdminUser;
  complex: AdminComplex;
};

export type AdminLoginResponse = {
  message: string;

  token: string;

  admin: AdminUser;
  complex: AdminComplex;
};

export type AdminMeResponse = {
  admin: AdminUser;
  complex: AdminComplex;
};

export type AdminCourtsResponse = {
  complex: {
    id: string;
    name: string | null;
  };

  total: number;

  courts: AdminCourt[];
};

export type CreateAdminCourtPayload = {
  slug: string;

  name: string;
  type: string;
  surface: string;

  priceInCents: number;
  players: number;

  highlight: string;
  description: string;
  imageUrl: string;

  times: string[];

  isActive: boolean;
};

export type UpdateAdminCourtPayload = Partial<
  Omit<CreateAdminCourtPayload, "slug">
>;

export type AdminCourtMutationResponse = {
  message: string;
  court: AdminCourt;
};

export type ApiErrorItem = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  message?: string;
  errors?: ApiErrorItem[];
};
