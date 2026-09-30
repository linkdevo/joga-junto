import type { AuthUser } from "@/types/auth";
import type { PlayerGamesResponse } from "@/types/games";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ProfileApiError extends Error {
  status: number;
  errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);

    this.name = "ProfileApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function parseErrorResponse(response: Response) {
  try {
    const data = await response.json();

    return {
      message: data?.message as string | undefined,
      errors: data?.errors as
        | Array<{ field: string; message: string }>
        | undefined,
    };
  } catch {
    return {
      message: undefined,
      errors: undefined,
    };
  }
}

export async function getPlayerProfile(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/player/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const { message } = await parseErrorResponse(response);

    throw new ProfileApiError(
      message ?? "Não foi possível carregar o perfil.",
      response.status,
    );
  }

  const data = await response.json();

  return data.user;
}

export type UpdatePlayerProfileInput = {
  name?: string;
  avatarUrl?: string | null;
};

export async function updatePlayerProfile(
  token: string,
  input: UpdatePlayerProfileInput,
): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/player/me`, {
    method: "PATCH",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const { message, errors } = await parseErrorResponse(response);

    throw new ProfileApiError(
      message ?? "Não foi possível atualizar o perfil.",
      response.status,
      errors,
    );
  }

  const data = await response.json();

  return data.user;
}

export async function getPlayerGames(
  token: string,
): Promise<PlayerGamesResponse> {
  const response = await fetch(`${API_URL}/player/me/games`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const { message } = await parseErrorResponse(response);

    throw new ProfileApiError(
      message ?? "Não foi possível carregar seus jogos.",
      response.status,
    );
  }

  return response.json();
}
