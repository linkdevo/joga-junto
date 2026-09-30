import {
  clearAdminSession,
  getAdminToken,
} from "@/services/admin-auth-storage";

import type {
  AdminBarProductMutationResponse,
  AdminBarProductsResponse,
  AdminCourtMutationResponse,
  AdminCourtsResponse,
  AdminFinanceContractsResponse,
  AdminFinanceCostsResponse,
  AdminFinanceSummary,
  AdminLeisureAreaMutationResponse,
  AdminLeisureAreasResponse,
  AdminLoginResponse,
  AdminMeResponse,
  AdminPayoutRequest,
  AdminPayoutsResponse,
  AdminWallet,
  ApiErrorResponse,
  CreateAdminCourtPayload,
  CreateAdminLeisureAreaPayload,
  CreateBarProductPayload,
  CreateFinanceContractPayload,
  CreateFinanceCostPayload,
  UpdateAdminCourtPayload,
  UpdateAdminLeisureAreaPayload,
  UpdateBarProductPayload,
  UpdatePayoutAccountPayload,
} from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  status: number;
  errors?: ApiErrorResponse["errors"];

  constructor(
    message: string,
    status: number,
    errors?: ApiErrorResponse["errors"],
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
};

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { authenticated = false, headers, body, ...requestOptions } = options;

  const requestHeaders = new Headers(headers);

  requestHeaders.set("Accept", "application/json");

  if (body !== undefined && body !== null) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = getAdminToken();

    if (!token) {
      throw new ApiError("Sessão administrativa não encontrada.", 401);
    }

    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      body,
      headers: requestHeaders,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }

  let responseData: unknown = null;

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const errorData = responseData as ApiErrorResponse | null;

    if (authenticated && response.status === 401) {
      clearAdminSession();
    }

    throw new ApiError(
      errorData?.message ?? "Erro ao realizar a requisição.",
      response.status,
      errorData?.errors,
    );
  }

  return responseData as T;
}

/**
 * ============================================================
 * AUTENTICAÇÃO ADMIN
 * ============================================================
 */

export function adminLogin(email: string, password: string) {
  return request<AdminLoginResponse>("/admin/auth/login", {
    method: "POST",

    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export function getAdminMe() {
  return request<AdminMeResponse>("/admin/me", {
    method: "GET",
    authenticated: true,
  });
}

/**
 * ============================================================
 * QUADRAS
 * ============================================================
 */

export function getAdminCourts() {
  return request<AdminCourtsResponse>("/admin/courts", {
    method: "GET",
    authenticated: true,
  });
}

export function createAdminCourt(payload: CreateAdminCourtPayload) {
  return request<AdminCourtMutationResponse>("/admin/courts", {
    method: "POST",
    authenticated: true,

    body: JSON.stringify(payload),
  });
}

export function updateAdminCourt(
  courtId: string,
  payload: UpdateAdminCourtPayload,
) {
  return request<AdminCourtMutationResponse>(`/admin/courts/${courtId}`, {
    method: "PATCH",
    authenticated: true,

    body: JSON.stringify(payload),
  });
}

/**
 * ============================================================
 * ÁREAS DE LAZER (CHURRASQUEIRA, ETC.)
 * ============================================================
 */

export function getAdminLeisureAreas() {
  return request<AdminLeisureAreasResponse>("/admin/leisure-areas", {
    method: "GET",
    authenticated: true,
  });
}

export function createAdminLeisureArea(
  payload: CreateAdminLeisureAreaPayload,
) {
  return request<AdminLeisureAreaMutationResponse>("/admin/leisure-areas", {
    method: "POST",
    authenticated: true,

    body: JSON.stringify(payload),
  });
}

export function updateAdminLeisureArea(
  areaId: string,
  payload: UpdateAdminLeisureAreaPayload,
) {
  return request<AdminLeisureAreaMutationResponse>(
    `/admin/leisure-areas/${areaId}`,
    {
      method: "PATCH",
      authenticated: true,

      body: JSON.stringify(payload),
    },
  );
}

/**
 * ============================================================
 * ESTOQUE DO BAR
 * ============================================================
 */

export function getAdminBarProducts() {
  return request<AdminBarProductsResponse>("/admin/bar-products", {
    method: "GET",
    authenticated: true,
  });
}

export function createAdminBarProduct(payload: CreateBarProductPayload) {
  return request<AdminBarProductMutationResponse>("/admin/bar-products", {
    method: "POST",
    authenticated: true,

    body: JSON.stringify(payload),
  });
}

export function updateAdminBarProduct(
  productId: string,
  payload: UpdateBarProductPayload,
) {
  return request<AdminBarProductMutationResponse>(
    `/admin/bar-products/${productId}`,
    {
      method: "PATCH",
      authenticated: true,

      body: JSON.stringify(payload),
    },
  );
}

export function adjustAdminBarProductStock(productId: string, delta: number) {
  return request<AdminBarProductMutationResponse>(
    `/admin/bar-products/${productId}/stock`,
    {
      method: "PATCH",
      authenticated: true,

      body: JSON.stringify({
        delta,
      }),
    },
  );
}

export function deleteAdminBarProduct(productId: string) {
  return request<{ message: string }>(`/admin/bar-products/${productId}`, {
    method: "DELETE",
    authenticated: true,
  });
}

/**
 * ============================================================
 * FINANCEIRO
 * ============================================================
 */

export function getAdminFinanceCosts(month: string) {
  return request<AdminFinanceCostsResponse>(
    `/admin/finance/costs?month=${encodeURIComponent(month)}`,
    {
      method: "GET",
      authenticated: true,
    },
  );
}

export function createAdminFinanceCost(payload: CreateFinanceCostPayload) {
  return request<{ message: string }>("/admin/finance/costs", {
    method: "POST",
    authenticated: true,

    body: JSON.stringify(payload),
  });
}

export function deleteAdminFinanceCost(costId: string) {
  return request<{ message: string }>(`/admin/finance/costs/${costId}`, {
    method: "DELETE",
    authenticated: true,
  });
}

export function getAdminFinanceContracts() {
  return request<AdminFinanceContractsResponse>("/admin/finance/contracts", {
    method: "GET",
    authenticated: true,
  });
}

export function createAdminFinanceContract(
  payload: CreateFinanceContractPayload,
) {
  return request<{ message: string }>("/admin/finance/contracts", {
    method: "POST",
    authenticated: true,

    body: JSON.stringify(payload),
  });
}

export function deleteAdminFinanceContract(contractId: string) {
  return request<{ message: string }>(
    `/admin/finance/contracts/${contractId}`,
    {
      method: "DELETE",
      authenticated: true,
    },
  );
}

export function getAdminFinanceSummary(month: string) {
  return request<AdminFinanceSummary>(
    `/admin/finance/summary?month=${encodeURIComponent(month)}`,
    {
      method: "GET",
      authenticated: true,
    },
  );
}

/**
 * ============================================================
 * CARTEIRA E PIX
 * ============================================================
 */

export function getAdminWallet() {
  return request<AdminWallet>("/admin/wallet", {
    method: "GET",
    authenticated: true,
  });
}

export function updateAdminPayoutAccount(
  payload: UpdatePayoutAccountPayload,
) {
  return request<{ message: string }>("/admin/wallet/payout-account", {
    method: "PATCH",
    authenticated: true,

    body: JSON.stringify(payload),
  });
}

export function getAdminPayouts() {
  return request<AdminPayoutsResponse>("/admin/wallet/payouts", {
    method: "GET",
    authenticated: true,
  });
}

export function requestAdminPayout() {
  return request<{ message: string; payout: AdminPayoutRequest }>(
    "/admin/wallet/payouts",
    {
      method: "POST",
      authenticated: true,
    },
  );
}
