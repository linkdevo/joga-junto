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
  minPlayers: number;
  goalkeeperPriceInCents: number;

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
  minPlayers: number;
  goalkeeperPriceInCents: number;

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

export type AdminLeisureAreaBlock = {
  id: string;
  startTime: string;
  endTime: string;
  priceInCents: number;
  isActive: boolean;
};

export type AdminLeisureArea = {
  id: string;
  complexId: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  blocks: AdminLeisureAreaBlock[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminLeisureAreasResponse = {
  complex: {
    id: string;
    name: string | null;
  };

  total: number;

  areas: AdminLeisureArea[];
};

export type LeisureAreaBlockPayload = {
  /**
   * Blocos existentes precisam manter o id, pois as reservas
   * referenciam o bloco escolhido pelo atleta.
   */
  id?: string;
  startTime: string;
  endTime: string;
  priceInCents: number;
  isActive: boolean;
};

export type CreateAdminLeisureAreaPayload = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  blocks: LeisureAreaBlockPayload[];
  isActive: boolean;
};

export type UpdateAdminLeisureAreaPayload = Partial<
  Omit<CreateAdminLeisureAreaPayload, "slug">
>;

export type AdminLeisureAreaMutationResponse = {
  message: string;
  area: AdminLeisureArea;
};

/**
 * ============================================================
 * ESTOQUE DO BAR
 * ============================================================
 */

export type BarProductCategory =
  "Bebidas" | "Alimentos" | "Acessórios" | "Outros";

export type AdminBarProduct = {
  id: string;
  complexId: string;
  name: string;
  category: BarProductCategory;
  priceInCents: number;
  currentStock: number;
  minimumStock: number;
  isBelowMinimum: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminBarProductsResponse = {
  products: AdminBarProduct[];
};

export type CreateBarProductPayload = {
  name: string;
  category: BarProductCategory;
  priceInCents: number;
  currentStock: number;
  minimumStock: number;
};

export type UpdateBarProductPayload = Partial<
  Omit<CreateBarProductPayload, "currentStock">
>;

export type AdminBarProductMutationResponse = {
  message: string;
  product: AdminBarProduct;
};

/**
 * ============================================================
 * FINANCEIRO
 * ============================================================
 */

export type FinanceCostType = "FIXED" | "VARIABLE";

export type AdminFinanceCost = {
  id: string;
  complexId: string;
  description: string;
  type: FinanceCostType;
  amountInCents: number;
  month: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminFinanceCostsResponse = {
  month: string;
  costs: AdminFinanceCost[];
};

export type CreateFinanceCostPayload = {
  description: string;
  type: FinanceCostType;
  amountInCents: number;
  month?: string;
};

export type AdminFinanceContract = {
  id: string;
  complexId: string;
  description: string;
  category: string;
  amountInCents: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminFinanceContractsResponse = {
  contracts: AdminFinanceContract[];
};

export type CreateFinanceContractPayload = {
  description: string;
  category: string;
  amountInCents: number;
};

export type AdminFinanceSummary = {
  month: string;

  revenue: {
    courtRentalsInCents: number;
    barSalesInCents: number;
    fixedContractsInCents: number;
    totalInCents: number;
  };

  costs: {
    fixedInCents: number;
    variableInCents: number;
    totalInCents: number;
  };

  netProfitInCents: number;
};

/**
 * ============================================================
 * CARTEIRA E PIX
 * ============================================================
 */

export type PixKeyType = "EMAIL" | "PHONE" | "CPF_CNPJ" | "RANDOM";

export type AdminPayoutAccount = {
  bankName: string;
  agency: string;
  accountNumber: string;
  pixKeyType: PixKeyType;
  pixKey: string;
  updatedAt: string;
};

export type AdminWallet = {
  availableInCents: number;
  futureReceivableInCents: number;
  payoutAccount: AdminPayoutAccount | null;
};

export type UpdatePayoutAccountPayload = {
  bankName: string;
  agency: string;
  accountNumber: string;
  pixKeyType: PixKeyType;
  pixKey: string;
};

export type AdminPayoutRequest = {
  id: string;
  complexId: string;
  amountInCents: number;
  status: "COMPLETED";
  requestedAt: string;
};

export type AdminPayoutsResponse = {
  payouts: AdminPayoutRequest[];
};

export type ApiErrorItem = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  message?: string;
  errors?: ApiErrorItem[];
};
