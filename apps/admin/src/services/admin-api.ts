import {
  clearAdminSession,
  getAdminToken,
} from "@/services/admin-auth-storage";

import type {
  AdminCourtMutationResponse,
  AdminCourtsResponse,
  AdminLoginResponse,
  AdminMeResponse,
  ApiErrorResponse,
  CreateAdminCourtPayload,
  UpdateAdminCourtPayload,
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
